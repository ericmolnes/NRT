/**
 * Oppdaterer feriepengesats (holidayRate) til 12% for alle prosjekter i Recman.
 * Feriepengesats settes på PROSJEKTET, ikke jobben — jobben arver fra prosjektet.
 *
 * Kjør: npx dotenvx run -f .env.local -- npx tsx scripts/update-job-feriepenger.ts
 * Tørkjør: npx dotenvx run -f .env.local -- npx tsx scripts/update-job-feriepenger.ts --dry-run
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const API_KEY = process.env.RECMAN_API_KEY!;
const API_URL = process.env.RECMAN_API_URL || "https://api.recman.io";

if (!API_KEY) {
  console.error("RECMAN_API_KEY er ikke satt");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

async function recmanGet(params: Record<string, string>) {
  const p = new URLSearchParams({ key: API_KEY, ...params });
  const res = await fetch(`${API_URL}/v2/get/?${p.toString()}`);
  if (!res.ok) throw new Error(`GET feil: ${res.status} ${res.statusText}`);
  return res.json();
}

async function recmanPost(scope: string, operation: string, data: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/v2/post/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: API_KEY, scope, operation, data }),
  });
  if (!res.ok) throw new Error(`POST feil: ${res.status} ${res.statusText}`);
  return res.json();
}

async function getAllProjects() {
  const all: Array<{ projectId: string; name: string; holidayRate: unknown }> = [];
  let page = 1;

  while (true) {
    const result = await recmanGet({
      scope: "project",
      fields: "name,holidayRate",
      page: String(page),
    });

    if (!result.success || !result.data) break;

    const entries = Object.entries(result.data) as Array<[string, Record<string, unknown>]>;
    if (entries.length === 0) break;

    for (const [projectId, project] of entries) {
      all.push({
        projectId,
        name: String(project.name || ""),
        holidayRate: project.holidayRate,
      });
    }

    if (all.length >= result.numRows) break;
    if (entries.length < 1000) break;
    page++;
  }

  return all;
}

async function main() {
  console.log(`=== Feriepengesats oppdatering ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"} ===\n`);

  console.log("Henter alle prosjekter fra Recman...");
  const projects = await getAllProjects();
  console.log(`Fant ${projects.length} prosjekter\n`);

  if (projects.length === 0) {
    console.log("Ingen prosjekter funnet.");
    return;
  }

  // Vis nåværende verdier for de første 5
  console.log("Eksempel på nåværende holidayRate-verdier:");
  for (const p of projects.slice(0, 5)) {
    console.log(`  "${p.name}" (${p.projectId}): holidayRate = ${JSON.stringify(p.holidayRate)}`);
  }
  console.log();

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const proj of projects) {
    const current = proj.holidayRate;

    // Hopp over hvis allerede 12%
    if (current === "12" || current === 12 || current === "12.00" || current === 12.0) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] "${proj.name}" (${proj.projectId}): ${current} → 12`);
      updated++;
      continue;
    }

    try {
      const result = await recmanPost("project", "update", {
        projectId: proj.projectId,
        holidayRate: 12,
      });

      if (result.success) {
        console.log(`  ✓ "${proj.name}" (${proj.projectId}): oppdatert`);
        updated++;
      } else {
        const errMsg = result.error?.[0]?.message || JSON.stringify(result.error || result);
        console.log(`  ✗ "${proj.name}" (${proj.projectId}): ${errMsg}`);
        failed++;
      }
    } catch (e) {
      console.error(`  ✗ "${proj.name}": ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n=== Ferdig ===`);
  console.log(`Oppdatert: ${updated}`);
  console.log(`Hoppet over (allerede 12%): ${skipped}`);
  if (failed > 0) console.log(`Feilet: ${failed}`);
}

main().catch(console.error);
