/**
 * Finner riktig feltnavn for å oppdatere feriepengesats på en jobb.
 * Tester ulike feltnavn — stopper ved første suksess.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const KEY = process.env.RECMAN_API_KEY!;
const URL = process.env.RECMAN_API_URL || "https://api.recman.io";

async function tryUpdate(jobId: string, fieldName: string, value: unknown) {
  const res = await fetch(`${URL}/v2/post/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: KEY, scope: "job", operation: "update", data: { jobId, [fieldName]: value } }),
  });
  const data = await res.json();
  return data;
}

async function run() {
  // Hent første jobb som har 10.20
  const p = new URLSearchParams({ key: KEY, scope: "job", fields: "name,holidayRate", page: "1" });
  const jobs = await (await fetch(`${URL}/v2/get/?${p}`)).json();
  const testJob = Object.entries(jobs.data as Record<string, any>).find(([, j]) => (j as any).holidayRate === "10.20");
  if (!testJob) { console.log("Ingen jobb med 10.20 funnet"); return; }
  const [jobId, job] = testJob;
  console.log(`Tester på jobb: "${(job as any).name}" (${jobId})\n`);

  const candidates = [
    // Ulike navn-varianter
    { field: "holidayRate", val: 12 },
    { field: "holidayRate", val: "12" },
    { field: "holiday_rate", val: 12 },
    { field: "vacationRate", val: 12 },
    { field: "vacation_rate", val: 12 },
    { field: "feriepenger", val: 12 },
    { field: "feriepengesats", val: 12 },
    { field: "holidayPercent", val: 12 },
    { field: "vacation", val: 12 },
    { field: "vacationPercent", val: 12 },
    { field: "salaryHolidayRate", val: 12 },
    { field: "salaryVacation", val: 12 },
    // Nested i salary-objekt
    { field: "salary", val: { holidayRate: 12 } },
    { field: "salary", val: { vacationRate: 12 } },
    // Nested i employment
    { field: "employment", val: { holidayRate: 12 } },
    { field: "employment", val: { feriepenger: 12 } },
  ];

  for (const { field, val } of candidates) {
    const result = await tryUpdate(jobId, field, val);
    const ok = result.success || (result.affectedRows > 0);
    const msg = result.errors?.[0] || result.error?.[0]?.message || result.message || "";
    console.log(`${ok ? "✓ FUNNET" : "✗"} field="${field}" val=${JSON.stringify(val).slice(0,20)}: ${msg || JSON.stringify(result).slice(0,80)}`);
    if (ok) {
      console.log("\nFull respons:", JSON.stringify(result, null, 2));
      break;
    }
    await new Promise(r => setTimeout(r, 100));
  }
}

run().catch(console.error);
