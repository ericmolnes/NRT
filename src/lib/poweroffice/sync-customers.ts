import { db } from "@/lib/db";
import { getCustomers } from "./resources";
import { syncResource } from "./sync";
import {
  getPowerOfficeTenantPoIdWhere,
  POWER_OFFICE_TENANT_SLUG,
} from "./config";
import type { POCustomerResponse } from "./types";

export function syncCustomers(userId: string) {
  return syncResource<POCustomerResponse>({
    resourceType: "Customer",
    fetchAll: getCustomers,
    userId,
    upsertItem: async (po) => {
      const poId = BigInt(po.id);

      await db.pOCustomer.upsert({
        where: getPowerOfficeTenantPoIdWhere(poId),
        create: {
          tenantSlug: POWER_OFFICE_TENANT_SLUG,
          poId,
          code: po.code,
          name: po.name,
          organizationNumber: po.organizationNumber,
          emailAddress: po.emailAddress,
          phoneNumber: po.phoneNumber,
          contactPersonName: po.contactPersonName,
          isActive: po.isActive,
          rawJson: JSON.stringify(po),
          lastSyncedAt: new Date(),
        },
        update: {
          code: po.code,
          name: po.name,
          organizationNumber: po.organizationNumber,
          emailAddress: po.emailAddress,
          phoneNumber: po.phoneNumber,
          contactPersonName: po.contactPersonName,
          isActive: po.isActive,
          rawJson: JSON.stringify(po),
          lastSyncedAt: new Date(),
        },
      });
    },
  });
}
