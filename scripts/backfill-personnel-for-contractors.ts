/**
 * One-time backfill script to link existing orphan RecmanCandidate records
 * (innleide / kontraktorer) to Personnel records via auto-matching.
 *
 * Run with: npx dotenvx run -f .env.local -- npx tsx scripts/backfill-personnel-for-contractors.ts
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
  console.log("=== Backfill Personnel for orphan contractors ===\n");

  const orphans = await db.recmanCandidate.findMany({
    where: {
      personnelId: null,
      OR: [
        { isContractor: true },
        { contractorPeriods: { some: {} } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      mobilePhone: true,
      title: true,
      isContractor: true,
    },
  });

  console.log(`Fant ${orphans.length} orphan-innleide\n`);

  let linked = 0;
  let created = 0;
  let skipped = 0;

  for (const c of orphans) {
    const matchId = await findMatchingPersonnel(c.email, c.firstName, c.lastName);
    const targetStatus = c.isContractor ? "ACTIVE" : "INACTIVE";

    if (matchId) {
      const existingLink = await db.recmanCandidate.findFirst({
        where: { personnelId: matchId },
        select: { id: true },
      });
      if (existingLink) {
        console.log(`  SKIP: ${c.firstName} ${c.lastName} — Personnel allerede linket til annen RecmanCandidate`);
        skipped++;
        continue;
      }

      // Bare link — ikke rør role/status på eksisterende Personnel
      // (kan være ansatt, og vi vil ikke overskrive deres data)
      await db.recmanCandidate.update({
        where: { id: c.id },
        data: { personnelId: matchId },
      });
      console.log(`  LINKED: ${c.firstName} ${c.lastName} → eksisterende Personnel (uten å endre role/status)`);
      linked++;
    } else {
      const personnel = await db.personnel.create({
        data: {
          name: `${c.firstName} ${c.lastName}`.trim(),
          email: c.email || undefined,
          phone: c.mobilePhone || c.phone || undefined,
          role: "Innleid",
          status: targetStatus,
        },
      });
      await db.recmanCandidate.update({
        where: { id: c.id },
        data: { personnelId: personnel.id },
      });
      console.log(`  CREATED: ${c.firstName} ${c.lastName} → ny Personnel (status=${targetStatus})`);
      created++;
    }
  }

  console.log(`\n=== Resultat: ${linked} linket, ${created} opprettet, ${skipped} hoppet over ===`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
