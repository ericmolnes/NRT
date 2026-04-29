import { db } from "@/lib/db";
import { getOutgoingInvoices } from "./resources";
import { syncResource } from "./sync";
import {
  getPowerOfficeTenantPoIdWhere,
  POWER_OFFICE_TENANT_SLUG,
} from "./config";
import type { POOutgoingInvoiceResponse } from "./types";

export function syncInvoices(userId: string) {
  return syncResource<POOutgoingInvoiceResponse>({
    resourceType: "Invoice",
    fetchAll: getOutgoingInvoices,
    userId,
    upsertItem: async (po) => {
      const poId = BigInt(po.id);

      // Koble til lokal kunde via customerId fra PowerOffice
      let customerId: string | null = null;
      if (po.customerId) {
        const customer = await db.pOCustomer.findUnique({
          where: getPowerOfficeTenantPoIdWhere(po.customerId),
          select: { id: true },
        });
        customerId = customer?.id ?? null;
      }

      await db.pOInvoice.upsert({
        where: getPowerOfficeTenantPoIdWhere(poId),
        create: {
          tenantSlug: POWER_OFFICE_TENANT_SLUG,
          poId,
          invoiceNumber: po.invoiceNumber,
          status: po.status,
          customerId,
          netAmount: po.netAmount,
          totalAmount: po.totalAmount,
          currencyCode: po.currencyCode,
          invoiceDate: po.invoiceDate ? new Date(po.invoiceDate) : null,
          dueDate: po.dueDate ? new Date(po.dueDate) : null,
          rawJson: JSON.stringify(po),
          lastSyncedAt: new Date(),
        },
        update: {
          invoiceNumber: po.invoiceNumber,
          status: po.status,
          customerId,
          netAmount: po.netAmount,
          totalAmount: po.totalAmount,
          currencyCode: po.currencyCode,
          invoiceDate: po.invoiceDate ? new Date(po.invoiceDate) : null,
          dueDate: po.dueDate ? new Date(po.dueDate) : null,
          rawJson: JSON.stringify(po),
          lastSyncedAt: new Date(),
        },
      });
    },
  });
}
