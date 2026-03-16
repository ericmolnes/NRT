"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCanModify } from "@/lib/rbac";
import { createProjectSchema, updateProjectSchema } from "@/lib/validations/project";
import { createProject as createPOProject } from "@/lib/poweroffice/resources";
import { revalidatePath } from "next/cache";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
  id?: string;
};

export async function createProject(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createProjectSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { syncToPowerOffice, ...projectData } = parsed.data;

  const project = await db.project.create({
    data: {
      ...projectData,
      poSyncStatus: syncToPowerOffice ? "PENDING_PUSH" : "NOT_SYNCED",
      createdById: session.user.id,
      createdByName: session.user.name ?? "Ukjent",
    },
  });

  if (syncToPowerOffice) {
    try {
      // Finn kundens PO-ID for kobling
      const customer = await db.customer.findUnique({
        where: { id: project.customerId },
        include: { poCustomer: true },
      });

      const poResult = await createPOProject({
        name: project.name,
        code: project.code ?? undefined,
        description: project.description ?? undefined,
        contactId: customer?.poCustomer ? Number(customer.poCustomer.poId) : undefined,
      });

      const poProject = await db.pOProject.create({
        data: {
          poId: BigInt(poResult.id),
          name: poResult.name ?? project.name,
          code: poResult.code,
          description: poResult.description,
          customerId: customer?.poCustomer?.id,
          rawJson: JSON.stringify(poResult),
        },
      });

      await db.project.update({
        where: { id: project.id },
        data: { poProjectId: poProject.id, poSyncStatus: "SYNCED" },
      });
    } catch (e) {
      console.error("PowerOffice project push failed:", e);
      await db.project.update({
        where: { id: project.id },
        data: { poSyncStatus: "PUSH_FAILED" },
      });
    }
  }

  revalidatePath(`/kunder/${project.customerId}`);
  revalidatePath("/prosjekter");
  return { success: true, message: "Prosjekt opprettet", id: project.id };
}

export async function updateProject(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = updateProjectSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { id, syncToPowerOffice, ...updateData } = parsed.data;

  const resource = await db.project.findUniqueOrThrow({ where: { id }, select: { createdById: true } });
  await assertCanModify(resource);

  await db.project.update({ where: { id }, data: updateData });

  revalidatePath(`/prosjekter/${id}`);
  return { success: true, message: "Prosjekt oppdatert" };
}

export async function deleteProject(projectId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { createdById: true },
  });
  await assertCanModify(project);

  await db.project.update({
    where: { id: projectId },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/prosjekter");
}
