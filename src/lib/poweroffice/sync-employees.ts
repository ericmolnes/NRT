import { db } from "@/lib/db";
import { getEmployees } from "./resources";
import { syncResource } from "./sync";
import type { POEmployeeResponse } from "./types";
import {
  findOrCreatePersonnel,
  enrichPersonnel,
} from "@/lib/personnel-matcher";

export function syncEmployees(userId: string) {
  return syncResource<POEmployeeResponse>({
    resourceType: "Employee",
    fetchAll: getEmployees,
    userId,
    upsertItem: async (po) => {
      const poEmployee = await db.pOEmployee.upsert({
        where: { poId: BigInt(po.id) },
        create: {
          poId: BigInt(po.id),
          code: po.code,
          firstName: po.firstName,
          lastName: po.lastName,
          email: po.emailAddress,
          phone: po.phoneNumber,
          department: po.departmentCode,
          jobTitle: po.jobTitle,
          isActive: po.isActive,
          rawJson: JSON.stringify(po),
          lastSyncedAt: new Date(),
        },
        update: {
          code: po.code,
          firstName: po.firstName,
          lastName: po.lastName,
          email: po.emailAddress,
          phone: po.phoneNumber,
          department: po.departmentCode,
          jobTitle: po.jobTitle,
          isActive: po.isActive,
          rawJson: JSON.stringify(po),
          lastSyncedAt: new Date(),
        },
        select: { id: true, personnelId: true },
      });

      // Auto-match or create Personnel record
      if (!poEmployee.personnelId) {
        const personnelId = await findOrCreatePersonnel({
          firstName: po.firstName,
          lastName: po.lastName,
          email: po.emailAddress,
          phone: po.phoneNumber,
          department: po.departmentCode,
          role: po.jobTitle || "Ansatt",
        });

        await db.pOEmployee.update({
          where: { id: poEmployee.id },
          data: { personnelId },
        });
      } else {
        // Enrich existing Personnel with fresh PO data
        await enrichPersonnel(poEmployee.personnelId, {
          phone: po.phoneNumber,
          department: po.departmentCode,
        });
      }
    },
  });
}
