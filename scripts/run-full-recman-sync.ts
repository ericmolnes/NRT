/**
 * Run full Recman sync manually.
 * Run: npx dotenvx run -f .env.local -- npx tsx scripts/run-full-recman-sync.ts
 */

// Set up db globally before imports
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const globalDb = new PrismaClient({ adapter });

// Monkey-patch the db module
import { syncRecmanCompanies } from "../src/lib/recman/sync-companies";
import { syncRecmanProjects } from "../src/lib/recman/sync-projects";
import { syncRecmanJobs } from "../src/lib/recman/sync-jobs";
import { syncAllCandidates } from "../src/lib/recman/sync";

async function main() {
  const triggeredBy = "manual-script";

  console.log("=== Full Recman Sync ===\n");

  // 1. Candidates
  console.log("1. Syncing candidates...");
  try {
    const r = await syncAllCandidates(triggeredBy);
    console.log(`   Done: ${r.synced}/${r.total} synced, ${r.failed} failed\n`);
  } catch (e: any) {
    console.error(`   ERROR: ${e.message}\n`);
  }

  // 2. Companies
  console.log("2. Syncing companies...");
  try {
    const r = await syncRecmanCompanies(triggeredBy);
    console.log(`   Done: ${r.synced} synced, ${r.created} created, ${r.failed} failed\n`);
  } catch (e: any) {
    console.error(`   ERROR: ${e.message}\n`);
    console.error(e.stack);
  }

  // 3. Projects
  console.log("3. Syncing projects...");
  try {
    const r = await syncRecmanProjects(triggeredBy);
    console.log(`   Done: ${r.synced} synced, ${r.created} created, ${r.failed} failed\n`);
  } catch (e: any) {
    console.error(`   ERROR: ${e.message}\n`);
    console.error(e.stack);
  }

  // 4. Jobs
  console.log("4. Syncing jobs...");
  try {
    const r = await syncRecmanJobs(triggeredBy);
    console.log(`   Done: ${r.synced} synced, ${r.created} created, ${r.failed} failed\n`);
  } catch (e: any) {
    console.error(`   ERROR: ${e.message}\n`);
    console.error(e.stack);
  }

  console.log("=== Done ===");
}

main()
  .catch((e) => console.error("Fatal:", e))
  .finally(() => process.exit(0));
