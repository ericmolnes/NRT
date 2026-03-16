import { db } from "@/lib/db";
import { getAllProjects } from "./client";
import type { RecmanProject } from "./types";

export async function syncRecmanProjects(triggeredBy: string) {
  const projects = await getAllProjects();
  let synced = 0;
  let created = 0;
  let failed = 0;

  for (const project of projects) {
    try {
      // Find the customer linked to this project's companyId
      let customerId: string | null = null;
      if (project.companyId) {
        const customer = await db.customer.findFirst({
          where: { recmanCompanyId: project.companyId },
          select: { id: true },
        });
        customerId = customer?.id ?? null;
      }

      // Try to find existing project by recmanProjectId
      let existing = await db.project.findFirst({
        where: { recmanProjectId: project.projectId },
        select: { id: true },
      });

      if (!existing && customerId) {
        // Try match by name within same customer
        existing = await db.project.findFirst({
          where: {
            customerId,
            name: { equals: project.name, mode: "insensitive" },
          },
          select: { id: true },
        });
      }

      if (existing) {
        await db.project.update({
          where: { id: existing.id },
          data: {
            recmanProjectId: project.projectId,
            description: project.description || undefined,
          },
        });
        synced++;
      } else if (customerId) {
        await db.project.create({
          data: {
            name: project.name,
            description: project.description || null,
            status: project.status === "active" ? "ACTIVE" : "ACTIVE",
            customerId,
            recmanProjectId: project.projectId,
            createdById: triggeredBy,
            createdByName: "Recman Sync",
          },
        });
        created++;
      } else {
        // No customer found — skip
        console.warn(
          `Hopper over prosjekt "${project.name}" — ingen kunde funnet for companyId ${project.companyId}`
        );
      }
    } catch (e) {
      console.error(`Feil ved sync av prosjekt ${project.name}:`, e);
      failed++;
    }
  }

  return { total: projects.length, synced, created, failed };
}
