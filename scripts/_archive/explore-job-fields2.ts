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
  // Hent jobb med alle kjente felt + holiday-relaterte felt
  const jobFields = [
    "name", "startDate", "endDate", "salary", "description",
    "colectiveAgreementId", "collectiveAgreementId",
    "employmentId", "responsibleUserId", "projectId",
    "holidayRate", "holidayPercent", "feriepenger", "feriepengesats",
    "vacationPay", "vacationRate", "wage", "status",
    "companyId", "candidateId",
  ].join(",");

  console.log("=== JOB (spesifikke felt) ===");
  const jobs = await get("job", jobFields);
  if (!jobs.success) {
    console.log("Feil:", JSON.stringify(jobs));
  } else {
    const entries = Object.entries(jobs.data as Record<string, any>);
    console.log(`Antall jobber: ${entries.length}`);
    if (entries[0]) {
      console.log("\nFørste jobb (alle returnerte felt):");
      console.log(JSON.stringify(entries[0][1], null, 2));
    }
    // Søk etter jobb med 10.2 i noe felt
    for (const [id, job] of entries) {
      const str = JSON.stringify(job);
      if (str.includes("10.2") || str.includes("10,2")) {
        console.log(`\nJobb ${id} inneholder 10.2:`, str);
      }
    }
  }

  // Prøv project med alle felt
  const projFields = [
    "name", "holidayRate", "holidayPercent", "feriepenger",
    "companyId", "status", "projectData",
  ].join(",");
  console.log("\n=== PROJECT (alle felt inkl holiday) ===");
  const proj = await get("project", projFields);
  if (!proj.success) {
    console.log("Feil:", JSON.stringify(proj));
  } else {
    const entries = Object.entries(proj.data as Record<string, any>);
    if (entries[0]) {
      console.log("Første prosjekt:", JSON.stringify(entries[0][1], null, 2));
    }
    // Vis alle holidayRate-verdier
    console.log("\nAlle prosjekters holidayRate:");
    for (const [id, p] of entries) {
      console.log(`  ${id}: holidayRate=${(p as any).holidayRate}`);
    }
  }
}

run().catch(console.error);
