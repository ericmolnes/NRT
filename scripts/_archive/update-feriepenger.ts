/**
 * Oppdaterer feriepenger til 12% for alle ansatte i Recman.
 * Kjør med: npx dotenvx run -f .env.local -- npx tsx scripts/update-feriepenger.ts
 *
 * Bruker direkte fetch uten rate limiter.
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

async function recmanGet(scope: string, fields: string, page: number) {
  const params = new URLSearchParams({ key: API_KEY, scope, fields, page: String(page) });
  const res = await fetch(`${API_URL}/v2/get/?${params.toString()}`);
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

async function getAllEmployees() {
  const all: Array<{ candidateId: string; firstName: string; lastName: string; employee: Record<string, unknown> }> = [];
  let page = 1;

  while (true) {
    const result = await recmanGet("candidate", "firstName,lastName,employee", page);
    if (!result.success || !result.data) break;

    const entries = Object.values(result.data) as Array<Record<string, unknown>>;
    if (entries.length === 0) break;

    for (const c of entries) {
      const emp = c.employee as Record<string, unknown> | null | undefined;
      if (emp && emp.startDate) {
        all.push({
          candidateId: String(c.candidateId),
          firstName: String(c.firstName),
          lastName: String(c.lastName),
          employee: emp,
        });
      }
    }

    if (all.length >= result.numRows) break;
    // Sjekk om vi har nok fra dette scope
    const totalFromApi = Object.values(result.data).length;
    if (totalFromApi < 50) break; // siste side
    page++;
  }

  return all;
}

async function main() {
  console.log(`=== Feriepenger oppdatering ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"} ===\n`);

  // 1. Hent alle ansatte
  console.log("Henter alle ansatte fra Recman...");
  const employees = await getAllEmployees();
  console.log(`Fant ${employees.length} ansatte med employee-data\n`);

  if (employees.length === 0) {
    console.log("Ingen ansatte funnet.");
    return;
  }

  // 2. Vis employee-feltene fra første ansatt for å finne riktig feltnavn
  const first = employees[0];
  console.log(`Eksempel employee-felt for ${first.firstName} ${first.lastName}:`);
  for (const [key, val] of Object.entries(first.employee)) {
    console.log(`  ${key}: ${JSON.stringify(val)}`);
  }
  console.log();

  // 3. Finn feriepenger-feltet
  const ferieField = Object.keys(first.employee).find(k =>
    k.toLowerCase().includes("ferie") ||
    k.toLowerCase().includes("holiday") ||
    k.toLowerCase().includes("vacation")
  );

  if (ferieField) {
    console.log(`Fant feriepenger-felt: "${ferieField}"`);
    console.log(`Nåværende verdi: ${first.employee[ferieField]}\n`);
  } else {
    console.log("Advarsel: Fant ikke et felt som ligner 'feriepenger'.");
    console.log("Alle tilgjengelige felt:", Object.keys(first.employee).join(", "));
    console.log("\nPrøver likevel med feltnavn 'feriepenger'...\n");
  }

  const fieldToUpdate = ferieField || "feriepenger";

  // 4. Oppdater alle ansatte
  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const emp of employees) {
    const currentValue = emp.employee[fieldToUpdate];

    // Hopp over hvis allerede 12%
    if (currentValue === "12" || currentValue === 12 || currentValue === "12.00") {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${emp.firstName} ${emp.lastName} (${emp.candidateId}): ${currentValue} → 12`);
      updated++;
      continue;
    }

    try {
      const result = await recmanPost("candidate", "update", {
        candidateId: emp.candidateId,
        employee: {
          [fieldToUpdate]: "12",
        },
      });

      if (result.success) {
        console.log(`  ✓ ${emp.firstName} ${emp.lastName} (${emp.candidateId}): oppdatert`);
        updated++;
      } else {
        const errMsg = result.error?.[0]?.message || JSON.stringify(result.error || result);
        console.log(`  ✗ ${emp.firstName} ${emp.lastName} (${emp.candidateId}): ${errMsg}`);
        failed++;
      }
    } catch (e) {
      console.error(`  ✗ ${emp.firstName} ${emp.lastName}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }

    // Liten pause for å ikke overbelaste API
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n=== Ferdig ===`);
  console.log(`Oppdatert: ${updated}`);
  console.log(`Hoppet over (allerede 12%): ${skipped}`);
  if (failed > 0) console.log(`Feilet: ${failed}`);
}

main().catch(console.error);
