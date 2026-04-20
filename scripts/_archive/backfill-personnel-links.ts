/**
 * One-time backfill script to link existing unlinked POEmployee and
 * RecmanCandidate records to Personnel records via auto-matching.
 *
 * Run with: npx dotenvx run -f .env.local -- npx tsx scripts/backfill-personnel-links.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const db = new PrismaClient({ adapter });

async function findMatchingPersonnel(
  email: string | null,
  firstName: string,
  lastName: string
): Promise<string | null> {
  if (email) {
    const byEmail = await db.personnel.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    const byName = await db.personnel.findFirst({
      where: { name: { equals: fullName, mode: "insensitive" } },
      select: { id: true },
    });
    if (byName) return byName.id;
  }

  return null;
}

async function main() {
  console.log("=== Backfill Personnel Links ===\n");

  // 1. Link unlinked POEmployees
  const unlinkedPO = await db.pOEmployee.findMany({
    where: { personnelId: null },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, department: true, jobTitle: true },
  });

  console.log(`Found ${unlinkedPO.length} unlinked POEmployees`);
  let poLinked = 0;
  let poCreated = 0;

  for (const po of unlinkedPO) {
    const matchId = await findMatchingPersonnel(po.email, po.firstName, po.lastName);

    if (matchId) {
      // Check if this Personnel is already linked to another POEmployee
      const existingLink = await db.pOEmployee.findFirst({
        where: { personnelId: matchId },
        select: { id: true },
      });
      if (existingLink) {
        console.log(`  SKIP: ${po.firstName} ${po.lastName} — Personnel already linked to another POEmployee`);
        continue;
      }

      await db.pOEmployee.update({ where: { id: po.id }, data: { personnelId: matchId } });
      console.log(`  LINKED: ${po.firstName} ${po.lastName} → existing Personnel`);
      poLinked++;
    } else {
      const personnel = await db.personnel.create({
        data: {
          name: `${po.firstName} ${po.lastName}`.trim(),
          email: po.email || undefined,
          phone: po.phone || undefined,
          department: po.department || undefined,
          role: po.jobTitle || "Ansatt",
          status: "ACTIVE",
        },
      });
      await db.pOEmployee.update({ where: { id: po.id }, data: { personnelId: personnel.id } });
      console.log(`  CREATED: ${po.firstName} ${po.lastName} → new Personnel`);
      poCreated++;
    }
  }

  console.log(`\nPOEmployee results: ${poLinked} linked, ${poCreated} created\n`);

  // 2. Link unlinked RecmanCandidates (employees only)
  const unlinkedRecman = await db.recmanCandidate.findMany({
    where: { personnelId: null, isEmployee: true },
    select: { id: true, firstName: true, lastName: true, email: true, title: true },
  });

  console.log(`Found ${unlinkedRecman.length} unlinked Recman employees`);
  let recmanLinked = 0;
  let recmanCreated = 0;

  for (const rc of unlinkedRecman) {
    const matchId = await findMatchingPersonnel(rc.email, rc.firstName, rc.lastName);

    if (matchId) {
      const existingLink = await db.recmanCandidate.findFirst({
        where: { personnelId: matchId },
        select: { id: true },
      });
      if (existingLink) {
        console.log(`  SKIP: ${rc.firstName} ${rc.lastName} — Personnel already linked to another RecmanCandidate`);
        continue;
      }

      await db.recmanCandidate.update({ where: { id: rc.id }, data: { personnelId: matchId } });
      console.log(`  LINKED: ${rc.firstName} ${rc.lastName} → existing Personnel`);
      recmanLinked++;
    } else {
      const personnel = await db.personnel.create({
        data: {
          name: `${rc.firstName} ${rc.lastName}`.trim(),
          email: rc.email || undefined,
          role: rc.title || "Ansatt",
          status: "ACTIVE",
        },
      });
      await db.recmanCandidate.update({ where: { id: rc.id }, data: { personnelId: personnel.id } });
      console.log(`  CREATED: ${rc.firstName} ${rc.lastName} → new Personnel`);
      recmanCreated++;
    }
  }

  console.log(`\nRecmanCandidate results: ${recmanLinked} linked, ${recmanCreated} created`);
  console.log(`\n=== Done ===`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
