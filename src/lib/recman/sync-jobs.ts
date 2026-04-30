import { db } from "@/lib/db";
import { getAllJobs } from "./client";
import { getOrCreateResourcePlan } from "@/lib/queries/resource-plan";

type RecmanJobAllocationDataInput = {
  entryId: string;
  jobAssignmentId: string;
  startDate: Date;
  endDate: Date | null;
  label: string;
};

export function buildRecmanJobAllocationData({
  entryId,
  jobAssignmentId,
  startDate,
  endDate,
  label,
}: RecmanJobAllocationDataInput) {
  if (!endDate) return null;

  return {
    entryId,
    jobAssignmentId,
    startDate,
    endDate,
    label,
    source: "JOB_GENERATED" as const,
  };
}

export async function syncRecmanJobs(triggeredBy: string) {
  const jobs = await getAllJobs();
  let synced = 0;
  let created = 0;
  let failed = 0;

  for (const rJob of jobs) {
    try {
      if (!rJob.candidateId || !rJob.projectId) continue;

      // Find Personnel via RecmanCandidate
      const candidate = await db.recmanCandidate.findFirst({
        where: { recmanId: rJob.candidateId },
        select: { personnelId: true },
      });
      if (!candidate?.personnelId) continue;
      const personnelId = candidate.personnelId;

      // Find NRT Project via recmanProjectId
      const project = await db.project.findFirst({
        where: { recmanProjectId: rJob.projectId },
        select: { id: true },
      });
      if (!project) continue;

      // Find or create a Job in NRT for this project + name
      let nrtJob = await db.job.findFirst({
        where: {
          projectId: project.id,
          name: { equals: rJob.name, mode: "insensitive" },
        },
        select: { id: true, resourcePlanLabelName: true },
      });

      if (!nrtJob) {
        nrtJob = await db.job.create({
          data: {
            name: rJob.name,
            description: rJob.description || null,
            type: "TIME_LIMITED",
            status: "ACTIVE",
            location: rJob.name, // Use job name as location placeholder
            startDate: new Date(rJob.startDate),
            endDate: rJob.endDate ? new Date(rJob.endDate) : null,
            projectId: project.id,
            resourcePlanLabelName: rJob.name,
            createdById: triggeredBy,
            createdByName: "Recman Sync",
          },
          select: { id: true, resourcePlanLabelName: true },
        });
        created++;
      } else {
        synced++;
      }

      // Create JobAssignment if not exists
      const existingAssignment = await db.jobAssignment.findUnique({
        where: {
          jobId_personnelId: {
            jobId: nrtJob.id,
            personnelId,
          },
        },
      });

      const assignment =
        existingAssignment ??
        (await db.jobAssignment.create({
          data: {
            jobId: nrtJob.id,
            personnelId,
            startDate: new Date(rJob.startDate),
            endDate: rJob.endDate ? new Date(rJob.endDate) : null,
            isActive: true,
          },
        }));

      // Ensure the Recman assignment is visible in the yearly resource plan.
      const year = new Date(rJob.startDate).getFullYear();
      const plan = await getOrCreateResourcePlan(
        year,
        triggeredBy,
        "Recman Sync"
      );

      const existingEntry = await db.resourcePlanEntry.findFirst({
        where: { resourcePlanId: plan.id, personnelId },
      });

      const entry =
        existingEntry ??
        (await (async () => {
          const [person, entryCount] = await Promise.all([
            db.personnel.findUnique({
              where: { id: personnelId },
              select: { name: true },
            }),
            db.resourcePlanEntry.count({
              where: { resourcePlanId: plan.id },
            }),
          ]);

          return db.resourcePlanEntry.create({
            data: {
              resourcePlanId: plan.id,
              personnelId,
              displayName: person?.name ?? "Ukjent",
              sortOrder: entryCount,
            },
          });
        })());

      const allocationData = buildRecmanJobAllocationData({
        entryId: entry.id,
        jobAssignmentId: assignment.id,
        startDate: new Date(rJob.startDate),
        endDate: rJob.endDate ? new Date(rJob.endDate) : null,
        label: nrtJob.resourcePlanLabelName ?? rJob.name,
      });

      if (allocationData) {
        const existingAllocation = await db.resourceAllocation.findFirst({
          where: {
            jobAssignmentId: assignment.id,
            source: "JOB_GENERATED",
            startDate: allocationData.startDate,
            endDate: allocationData.endDate,
            label: allocationData.label,
          },
          select: { id: true },
        });

        if (!existingAllocation) {
          await db.resourceAllocation.create({ data: allocationData });
        }
      }
    } catch (e) {
      console.error(`Feil ved sync av jobb ${rJob.name}:`, e);
      failed++;
    }
  }

  return { total: jobs.length, synced, created, failed };
}
