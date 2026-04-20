/**
 * Oppdaterer holidayRate til 12% på alle jobber i Recman.
 * Kjør: npx dotenvx run -f .env.local -- npx tsx scripts/update-job-holidayrate.ts
 * Tørkjør: npx dotenvx run -f .env.local -- npx tsx scripts/update-job-holidayrate.ts --dry-run
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const KEY = process.env.RECMAN_API_KEY!;
const URL = process.env.RECMAN_API_URL || "https://api.recman.io";
const DRY_RUN = process.argv.includes("--dry-run");

if (!KEY) { console.error("RECMAN_API_KEY er ikke satt"); process.exit(1); }

async function getAllJobs() {
  const all: Array<{ jobId: string; name: string; holidayRate: string }> = [];
  let page = 1;
  while (true) {
    const p = new URLSearchParams({ key: KEY, scope: "job", fields: "name,holidayRate", page: String(page) });
    const res = await fetch(`${URL}/v2/get/?${p}`);
    const data = await res.json();
    if (!data.success || !data.data) break;
    const entries = Object.entries(data.data as Record<string, any>);
    if (entries.length === 0) break;
    for (const [, job] of entries) {
      all.push({ jobId: String((job as any).jobId), name: String((job as any).name || ""), holidayRate: String((job as any).holidayRate ?? "") });
    }
    if (all.length >= data.numRows) break;
    if (entries.length < 1000) break;
    page++;
  }
  return all;
}

async function updateJob(jobId: string) {
  const res = await fetch(`${URL}/v2/post/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: KEY, scope: "job", operation: "update", data: { jobId, holidayRate: 12 } }),
  });
  return res.json();
}

async function main() {
  console.log(`=== Job holidayRate oppdatering ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"} ===\n`);
  const jobs = await getAllJobs();
  console.log(`Fant ${jobs.length} jobber totalt\n`);

  const toUpdate = jobs.filter(j => j.holidayRate !== "12" && j.holidayRate !== "12.00");
  const skipped = jobs.length - toUpdate.length;
  console.log(`Skal oppdateres: ${toUpdate.length} | Allerede 12%: ${skipped}\n`);

  let updated = 0, failed = 0;
  for (const job of toUpdate) {
    if (DRY_RUN) {
      console.log(`  [DRY] "${job.name}" (${job.jobId}): ${job.holidayRate} → 12`);
      updated++;
      continue;
    }
    try {
      const result = await updateJob(job.jobId);
      if (result.success || result.affectedRows > 0) {
        console.log(`  ✓ "${job.name}" (${job.jobId})`);
        updated++;
      } else {
        const err = result.error?.[0]?.message || JSON.stringify(result).slice(0, 100);
        console.log(`  ✗ "${job.name}" (${job.jobId}): ${err}`);
        failed++;
      }
    } catch (e) {
      console.error(`  ✗ "${job.name}": ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n=== Ferdig ===`);
  console.log(`Oppdatert: ${updated}`);
  console.log(`Allerede 12% (hoppet over): ${skipped}`);
  if (failed > 0) console.log(`Feilet: ${failed}`);
}

main().catch(console.error);
