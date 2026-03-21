import { config } from "dotenv";
config({ path: ".env.local" });

const KEY = process.env.RECMAN_API_KEY!;
const URL = process.env.RECMAN_API_URL || "https://api.recman.io";

async function get(scope: string, fields?: string, page = "1") {
  const p = new URLSearchParams({ key: KEY, scope, page });
  if (fields) p.set("fields", fields);
  const res = await fetch(`${URL}/v2/get/?${p}`);
  return res.json();
}

async function run() {
  // 1. Hent job uten fields-filter — får alle felt
  console.log("=== JOB (alle felt, første side) ===");
  const jobs = await get("job");
  if (!jobs.success) {
    console.log("Feil:", JSON.stringify(jobs));
  } else {
    const first = Object.entries(jobs.data as Record<string, any>)[0];
    if (first) {
      console.log("Første jobb (alle felt):");
      console.log(JSON.stringify(first[1], null, 2));
    }
  }

  // 2. Hent employment scope
  console.log("\n=== EMPLOYMENT (alle felt, første side) ===");
  const emp = await get("employment");
  if (!emp.success) {
    console.log("Feil:", JSON.stringify(emp).slice(0, 200));
  } else {
    const first = Object.entries(emp.data as Record<string, any>)[0];
    if (first) {
      console.log("Første employment (alle felt):");
      console.log(JSON.stringify(first[1], null, 2));
    }
  }

  // 3. Hent project med alle felt
  console.log("\n=== PROJECT (alle felt, første side) ===");
  const proj = await get("project");
  if (!proj.success) {
    console.log("Feil:", JSON.stringify(proj).slice(0, 200));
  } else {
    const first = Object.entries(proj.data as Record<string, any>)[0];
    if (first) {
      console.log("Første project (alle felt):");
      console.log(JSON.stringify(first[1], null, 2));
    }
  }

  // 4. Hent collectiveAgreement med alle felt
  console.log("\n=== COLLECTIVE AGREEMENT (alle felt) ===");
  const ca = await get("collectiveAgreement");
  if (!ca.success) {
    console.log("Feil:", JSON.stringify(ca).slice(0, 200));
  } else {
    for (const [id, row] of Object.entries(ca.data as Record<string, any>)) {
      console.log(`ID ${id}:`, JSON.stringify(row, null, 2));
    }
  }
}

run().catch(console.error);
