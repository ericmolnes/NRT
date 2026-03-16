import { db } from "@/lib/db";
import { getAllCompanies } from "./client";
import type { RecmanCompany } from "./types";

export async function syncRecmanCompanies(triggeredBy: string) {
  const companies = await getAllCompanies();
  let synced = 0;
  let created = 0;
  let failed = 0;

  for (const company of companies) {
    try {
      // Skip own company
      if (company.type === "ownCompany") continue;

      // Try to find existing customer by recmanCompanyId or name
      let customer = await db.customer.findFirst({
        where: { recmanCompanyId: company.companyId },
        select: { id: true },
      });

      if (!customer) {
        // Try match by name
        customer = await db.customer.findFirst({
          where: { name: { equals: company.name, mode: "insensitive" } },
          select: { id: true },
        });
      }

      if (customer) {
        // Update existing — link and refresh data
        await db.customer.update({
          where: { id: customer.id },
          data: {
            recmanCompanyId: company.companyId,
            recmanCompanyType: company.type ?? null,
            emailAddress: company.email || undefined,
            notes: company.notes || undefined,
            organizationNumber: company.vatNumber || undefined,
          },
        });
        synced++;
      } else {
        // Create new customer
        await db.customer.create({
          data: {
            name: company.name,
            emailAddress: company.email || null,
            organizationNumber: company.vatNumber || null,
            notes: company.notes || null,
            recmanCompanyId: company.companyId,
            recmanCompanyType: company.type ?? null,
            isActive: true,
            createdById: triggeredBy,
            createdByName: "Recman Sync",
          },
        });
        created++;
      }
    } catch (e) {
      console.error(`Feil ved sync av selskap ${company.name}:`, e);
      failed++;
    }
  }

  return { total: companies.length, synced, created, failed };
}
