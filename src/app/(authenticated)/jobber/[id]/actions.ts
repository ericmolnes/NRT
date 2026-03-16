"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCanModify } from "@/lib/rbac";
import { createJobSchema, updateJobSchema, assignPersonnelSchema } from "@/lib/validations/job";
import { generateRotationAllocations } from "@/lib/rotation-generator";
import { computeAllocationChanges } from "@/lib/resource-plan-utils";
import { getOrCreateResourcePlan } from "@/lib/queries/resource-plan";
import { revalidatePath } from "next/cache";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
  id?: string;
};

export async function createJob(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createJobSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const jobData = parsed.data;

  // Finn prosjekt og kunde for label-navn
  const project = await db.project.findUnique({
    where: { id: jobData.projectId },
    include: { customer: { select: { name: true } } },
  });

  if (!project) return { message: "Prosjekt ikke funnet" };

  // Auto-generer label-navn
  const labelName = jobData.resourcePlanLabelName
    ?? `${project.customer.name} - ${jobData.name}`;

  const job = await db.job.create({
    data: {
      name: jobData.name,
      description: jobData.description,
      type: jobData.type,
      location: jobData.location,
      startDate: jobData.startDate,
      endDate: jobData.endDate,
      projectId: jobData.projectId,
      rotationPatternId: jobData.rotationPatternId,
      resourcePlanLabelName: labelName,
      createdById: session.user.id,
      createdByName: session.user.name ?? "Ukjent",
    },
  });

  // Auto-opprett ResourcePlanLabel for jobben
  const year = new Date(jobData.startDate).getFullYear();
  const plan = await getOrCreateResourcePlan(year, session.user.id, session.user.name ?? "Ukjent");

  const existingLabel = await db.resourcePlanLabel.findUnique({
    where: { resourcePlanId_name: { resourcePlanId: plan.id, name: labelName } },
  });

  if (!existingLabel) {
    const labelCount = await db.resourcePlanLabel.count({ where: { resourcePlanId: plan.id } });
    // Generer farge basert på indeks (golden angle)
    const hue = (labelCount * 137.508) % 360;
    const color = hslToHex(hue, 65, 50);

    await db.resourcePlanLabel.create({
      data: {
        resourcePlanId: plan.id,
        name: labelName,
        color,
        textColor: "#ffffff",
        category: "client",
        sortOrder: labelCount,
      },
    });
  }

  revalidatePath(`/prosjekter/${jobData.projectId}`);
  revalidatePath("/jobber");
  return { success: true, message: "Jobb opprettet", id: job.id };
}

export async function updateJob(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = updateJobSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { id, ...updateData } = parsed.data;

  const resource = await db.job.findUniqueOrThrow({ where: { id }, select: { createdById: true } });
  await assertCanModify(resource);

  await db.job.update({ where: { id }, data: updateData });

  revalidatePath(`/jobber/${id}`);
  return { success: true, message: "Jobb oppdatert" };
}

export async function assignPersonnel(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = assignPersonnelSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { jobId, personnelIds, startDate, endDate, rotationPatternId } = parsed.data;

  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      rotationPattern: { include: { segments: { orderBy: { sortOrder: "asc" } } } },
    },
  });

  if (!job) return { message: "Jobb ikke funnet" };

  const pattern = rotationPatternId
    ? await db.rotationPattern.findUnique({
        where: { id: rotationPatternId },
        include: { segments: { orderBy: { sortOrder: "asc" } } },
      })
    : job.rotationPattern;

  // Finn/opprett ressursplan
  const year = new Date(startDate).getFullYear();
  const plan = await getOrCreateResourcePlan(year, session.user.id, session.user.name ?? "Ukjent");

  let assignedCount = 0;

  for (const personnelId of personnelIds) {
    // Sjekk om allerede tilordnet
    const existing = await db.jobAssignment.findUnique({
      where: { jobId_personnelId: { jobId, personnelId } },
    });
    if (existing) continue;

    // Opprett tilordning
    const assignment = await db.jobAssignment.create({
      data: {
        jobId,
        personnelId,
        startDate,
        endDate: endDate ?? job.endDate,
        rotationPatternId: rotationPatternId ?? job.rotationPatternId,
      },
    });

    // Finn/opprett ResourcePlanEntry
    let entry = await db.resourcePlanEntry.findFirst({
      where: { resourcePlanId: plan.id, personnelId },
    });

    if (!entry) {
      const person = await db.personnel.findUnique({ where: { id: personnelId } });
      const entryCount = await db.resourcePlanEntry.count({ where: { resourcePlanId: plan.id } });
      entry = await db.resourcePlanEntry.create({
        data: {
          resourcePlanId: plan.id,
          personnelId,
          displayName: person?.name ?? "Ukjent",
          sortOrder: entryCount,
        },
      });
    }

    // Generer rotasjonsallokeringer
    if (pattern) {
      const generateUntil = endDate ?? job.endDate ?? new Date(year, 11, 31);
      const allocations = generateRotationAllocations(
        startDate,
        generateUntil,
        pattern.segments,
        job.resourcePlanLabelName ?? job.name
      );

      // Skriv til ressursplanen
      for (const alloc of allocations) {
        // Hent eksisterende allokeringer som overlapper
        const existingAllocs = await db.resourceAllocation.findMany({
          where: {
            entryId: entry.id,
            startDate: { lte: alloc.endDate },
            endDate: { gte: alloc.startDate },
          },
        });

        const changes = computeAllocationChanges(
          existingAllocs.map((a) => ({
            id: a.id,
            entryId: a.entryId,
            startDate: a.startDate,
            endDate: a.endDate,
            label: a.label,
          })),
          alloc.startDate,
          alloc.endDate,
          alloc.label
        );

        await db.$transaction([
          ...(changes.toDelete.length > 0
            ? [db.resourceAllocation.deleteMany({ where: { id: { in: changes.toDelete } } })]
            : []),
          ...changes.toUpdate.map((u) =>
            db.resourceAllocation.update({
              where: { id: u.id },
              data: { startDate: u.startDate, endDate: u.endDate },
            })
          ),
          ...changes.toCreate.map((c) =>
            db.resourceAllocation.create({
              data: {
                entryId: entry!.id,
                startDate: c.startDate,
                endDate: c.endDate,
                label: c.label,
                source: "JOB_GENERATED",
                jobAssignmentId: assignment.id,
              },
            })
          ),
        ]);
      }
    }

    assignedCount++;
  }

  revalidatePath(`/jobber/${jobId}`);
  revalidatePath("/ressursplan");
  return { success: true, message: `${assignedCount} person(er) tilordnet` };
}

export async function removeAssignment(assignmentId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  // Slett jobb-genererte allokeringer
  await db.resourceAllocation.deleteMany({
    where: { jobAssignmentId: assignmentId, source: "JOB_GENERATED" },
  });

  // Frikoble overstyrte allokeringer
  await db.resourceAllocation.updateMany({
    where: { jobAssignmentId: assignmentId, source: "JOB_OVERRIDDEN" },
    data: { jobAssignmentId: null, source: "MANUAL" },
  });

  const assignment = await db.jobAssignment.delete({ where: { id: assignmentId } });

  revalidatePath(`/jobber/${assignment.jobId}`);
  revalidatePath("/ressursplan");
  return { success: true, message: "Tilordning fjernet" };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export async function deleteJob(jobId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const job = await db.job.findUniqueOrThrow({
    where: { id: jobId },
    select: { createdById: true },
  });
  await assertCanModify(job);

  await db.job.update({
    where: { id: jobId },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/jobber");
}
