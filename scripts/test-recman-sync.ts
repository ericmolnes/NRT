/**
 * Test Recman sync for companies, projects, and jobs.
 * Run: npx dotenvx run -f .env.local -- npx tsx scripts/test-recman-sync.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const API_KEY = process.env.RECMAN_API_KEY!;
const API_URL = process.env.RECMAN_API_URL || "https://api.recman.io";

async function main() {
  console.log("=== Test Recman Sync ===\n");

  // 1. Test companies
  console.log("--- Companies ---");
  try {
    const res = await fetch(`${API_URL}/v2/get/?key=${API_KEY}&scope=company&fields=name,email,type,vatNumber&page=1`);
    const data = await res.json();
    if (!data.success) {
      console.log("API Error:", JSON.stringify(data));
    } else {
      console.log(`Got ${data.numRows} companies from Recman`);
      const companies = Object.values(data.data) as Array<Record<string, unknown>>;

      // Try creating first non-own company
      for (const c of companies) {
        if (c.type === "ownCompany") continue;

        console.log(`\nTesting: ${c.name} (type=${c.type}, vat=${c.vatNumber})`);

        const existing = await db.customer.findFirst({
          where: { recmanCompanyId: String(c.companyId) },
        });

        if (existing) {
          console.log(`  Already linked: ${existing.id}`);
        } else {
          const byName = await db.customer.findFirst({
            where: { name: { equals: String(c.name), mode: "insensitive" } },
          });
          if (byName) {
            console.log(`  Match by name: ${byName.id} — updating recmanCompanyId`);
            await db.customer.update({
              where: { id: byName.id },
              data: { recmanCompanyId: String(c.companyId), recmanCompanyType: String(c.type || "") },
            });
          } else {
            console.log(`  Creating new customer...`);
            const created = await db.customer.create({
              data: {
                name: String(c.name),
                emailAddress: c.email ? String(c.email) : null,
                organizationNumber: c.vatNumber ? String(c.vatNumber) : null,
                recmanCompanyId: String(c.companyId),
                recmanCompanyType: c.type ? String(c.type) : null,
                isActive: true,
                createdById: "test",
                createdByName: "Test Script",
              },
            });
            console.log(`  Created: ${created.id}`);
          }
        }
        break; // Only test first one
      }
    }
  } catch (e) {
    console.error("Company error:", e);
  }

  // 2. Test projects
  console.log("\n--- Projects ---");
  try {
    const res = await fetch(`${API_URL}/v2/get/?key=${API_KEY}&scope=project&fields=name,companyId,status&page=1`);
    const data = await res.json();
    if (!data.success) {
      console.log("API Error:", JSON.stringify(data));
    } else {
      console.log(`Got ${data.numRows} projects from Recman`);
      const first = Object.values(data.data)[0] as Record<string, unknown>;
      console.log("First project:", JSON.stringify(first));
    }
  } catch (e) {
    console.error("Project error:", e);
  }

  // 3. Test jobs
  console.log("\n--- Jobs ---");
  try {
    const res = await fetch(`${API_URL}/v2/get/?key=${API_KEY}&scope=job&fields=name,startDate,endDate&page=1`);
    const data = await res.json();
    if (!data.success) {
      console.log("API Error:", JSON.stringify(data));
    } else {
      console.log(`Got ${data.numRows} jobs from Recman`);
      const first = Object.values(data.data)[0] as Record<string, unknown>;
      console.log("First job:", JSON.stringify(first));
    }
  } catch (e) {
    console.error("Job error:", e);
  }

  console.log("\n=== Done ===");
}

main()
  .catch((e) => console.error("Fatal:", e))
  .finally(() => process.exit(0));
