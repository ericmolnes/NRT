/**
 * Seed standard rotasjonsmønstre.
 * Kjøres med: npx tsx prisma/seed-rotations.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PATTERNS = [
  {
    name: "14-21 offshore",
    description: "14 dager på rigg, 21 dager fri. Standard offshore-rotasjon.",
    segments: [
      { type: "WORK" as const, days: 14 },
      { type: "OFF" as const, days: 21 },
    ],
  },
  {
    name: "14-28 offshore",
    description: "14 dager på rigg, 28 dager fri. Utvidet offshore-rotasjon.",
    segments: [
      { type: "WORK" as const, days: 14 },
      { type: "OFF" as const, days: 28 },
    ],
  },
  {
    name: "15-20 onshore",
    description: "15 dager på, 20 dager fri. Standard onshore-rotasjon.",
    segments: [
      { type: "WORK" as const, days: 15 },
      { type: "OFF" as const, days: 20 },
    ],
  },
  {
    name: "14-14",
    description: "14 dager på, 14 dager fri. Lik på/av-rotasjon.",
    segments: [
      { type: "WORK" as const, days: 14 },
      { type: "OFF" as const, days: 14 },
    ],
  },
  {
    name: "5-2 kontor",
    description: "Mandag-fredag med helg. Standard kontortid.",
    segments: [
      { type: "WORK" as const, days: 5 },
      { type: "OFF" as const, days: 2 },
    ],
  },
  {
    name: "14-21 med ferie",
    description: "14 dager arbeid, 14 dager fri, 7 dager ferie. Offshore med innbakt ferie.",
    segments: [
      { type: "WORK" as const, days: 14 },
      { type: "OFF" as const, days: 14 },
      { type: "VACATION" as const, days: 7 },
    ],
  },
];

async function main() {
  console.log("Seeder standard rotasjonsmønstre...");

  for (const pattern of PATTERNS) {
    const totalCycleDays = pattern.segments.reduce((sum, s) => sum + s.days, 0);

    const existing = await prisma.rotationPattern.findUnique({
      where: { name: pattern.name },
    });

    if (existing) {
      console.log(`  Finnes allerede: ${pattern.name}`);
      continue;
    }

    await prisma.rotationPattern.create({
      data: {
        name: pattern.name,
        description: pattern.description,
        totalCycleDays,
        createdById: "seed",
        createdByName: "System",
        segments: {
          create: pattern.segments.map((s, i) => ({
            type: s.type,
            days: s.days,
            sortOrder: i,
          })),
        },
      },
    });

    console.log(`  Opprettet: ${pattern.name} (${totalCycleDays} dager)`);
  }

  console.log("Ferdig!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Seed feilet:", e);
  process.exit(1);
});
