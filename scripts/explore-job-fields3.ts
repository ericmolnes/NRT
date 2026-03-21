import { config } from "dotenv";
config({ path: ".env.local" });

const KEY = process.env.RECMAN_API_KEY!;
const URL = process.env.RECMAN_API_URL || "https://api.recman.io";

async function get(scope: string, fields: string, page = "1") {
  const p = new URLSearchParams({ key: KEY, scope, fields, page });
  const res = await fetch(`${URL}/v2/get/?${p}`);
  return res.json();
}

async function run() {
  // Gyldig job-felt: name, startDate, endDate, salary, description, collectiveAgreementId, employmentId, responsibleUserId, holidayRate
  const jobFields = "name,startDate,endDate,salary,description,collectiveAgreementId,employmentId,responsibleUserId,holidayRate";

  console.log("=== JOB med holidayRate ===");
  const jobs = await get("job", jobFields);
  if (!jobs.success) {
    console.log("Feil:", JSON.stringify(jobs));
  } else {
    const entries = Object.entries(jobs.data as Record<string, any>);
    console.log(`Antall jobber: ${entries.length} / ${jobs.numRows}`);
    if (entries[0]) {
      console.log("\nFørste jobb:");
      console.log(JSON.stringify(entries[0][1], null, 2));
    }
    // Tell opp unike holidayRate-verdier
    const rates: Record<string, number> = {};
    for (const [, job] of entries) {
      const r = String((job as any).holidayRate ?? "null");
      rates[r] = (rates[r] || 0) + 1;
    }
    console.log("\nFordelingen av holidayRate på jobber:");
    for (const [rate, count] of Object.entries(rates)) {
      console.log(`  ${rate}: ${count} jobber`);
    }
  }

  // Project med kun gyldige felt
  console.log("\n=== PROJECT med holidayRate ===");
  const proj = await get("project", "name,holidayRate");
  if (!proj.success) {
    console.log("Feil:", JSON.stringify(proj));
  } else {
    const entries = Object.entries(proj.data as Record<string, any>);
    // Tell opp
    const rates: Record<string, number> = {};
    for (const [, p] of entries) {
      const r = String((p as any).holidayRate ?? "null");
      rates[r] = (rates[r] || 0) + 1;
    }
    console.log(`${entries.length} prosjekter. Fordeling:`);
    for (const [rate, count] of Object.entries(rates)) {
      console.log(`  holidayRate=${rate}: ${count} prosjekter`);
    }
  }
}

run().catch(console.error);
