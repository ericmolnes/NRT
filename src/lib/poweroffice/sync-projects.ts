import { db } from "@/lib/db";
import { getProjects } from "./resources";
import { syncResource } from "./sync";
import type { POProjectResponse } from "./types";

export function syncProjects(userId: string) {
  return syncResource<POProjectResponse>({
    resourceType: "Project",
    fetchAll: getProjects,
    userId,
    upsertItem: async (po) => {
      // Finn lokal kunde basert på PowerOffice contactId
      let customerId: string | null = null;
      if (po.contactId) {
        const customer = await db.pOCustomer.findUnique({
          where: { poId: BigInt(po.contactId) },
          select: { id: true },
        });
        customerId = customer?.id ?? null;
      }

      await db.pOProject.upsert({
        where: { poId: BigInt(po.id) },
        create: {
          poId: BigInt(po.id),
          code: po.code,
          name: po.name,
          description: po.description,
          isCompleted: po.isCompleted,
          customerId,
          rawJson: JSON.stringify(po),
          lastSyncedAt: new Date(),
        },
        update: {
          code: po.code,
          name: po.name,
          description: po.description,
          isCompleted: po.isCompleted,
          customerId,
          rawJson: JSON.stringify(po),
          lastSyncedAt: new Date(),
        },
      });
    },
  });
}
