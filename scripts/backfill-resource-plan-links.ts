/**
 * One-time backfill script to link ResourcePlanEntry records to Personnel
 * by matching displayName against Personnel.name.
 *
 * Run with: npx dotenvx run -f .env.local -- npx tsx scripts/backfill-resource-plan-links.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const db = new PrismaClient({ adapter });

async function main() {
  console.log("=== Backfill Resource Plan → Personnel Links ===\n");

  const unlinked = await db.resourcePlanEntry.findMany({
    where: { personnelId: null },
    select: { id: true, displayName: true },
  });

  console.log(`Found ${unlinked.length} unlinked resource plan entries\n`);

  let linked = 0;
  let notFound = 0;

  for (const entry of unlinked) {
    const name = entry.displayName.trim();
    if (!name) {
      notFound++;
      continue;
    }

    // Try exact match first
    let personnel = await db.personnel.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true },
    });

    // Try partial match (first + last name in any order)
    if (!personnel) {
      const parts = name.split(/\s+/);
      if (parts.length >= 2) {
        personnel = await db.personnel.findFirst({
          where: {
            AND: parts.map((part) => ({
              name: { contains: part, mode: "insensitive" as const },
            })),
          },
          select: { id: true, name: true },
        });
      }
    }

    if (personnel) {
      await db.resourcePlanEntry.update({
        where: { id: entry.id },
        data: { personnelId: personnel.id },
      });
      console.log(`  LINKED: "${entry.displayName}" → ${personnel.name}`);
      linked++;
    } else {
      console.log(`  NOT FOUND: "${entry.displayName}"`);
      notFound++;
    }
  }

  console.log(`\nResults: ${linked} linked, ${notFound} not found`);
  console.log("=== Done ===");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
