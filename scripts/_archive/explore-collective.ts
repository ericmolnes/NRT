import { config } from "dotenv";
config({ path: ".env.local" });

const KEY = process.env.RECMAN_API_KEY!;
const URL = process.env.RECMAN_API_URL || "https://api.recman.io";

async function run() {
  // Fetch all jobs — look for job nr 66 / Nes
  const p = new URLSearchParams({
    key: KEY,
    scope: "job",
    fields: "name,startDate,endDate,salary,description,created,updated",
    page: "1",
  });
  const res = await fetch(`${URL}/v2/get/?${p}`);
  const data = await res.json();
  console.log("numRows:", data.numRows, "| success:", data.success);
  if (!data.success) {
    console.log("Error:", JSON.stringify(data));
    return;
  }

  // Print all jobs
  for (const [id, job] of Object.entries(data.data as Record<string, any>)) {
    if (String((job as any).name || "").toLowerCase().includes("nes") || String((job as any).projectId || "").includes("1237843")) {
      console.log(id, JSON.stringify(job));
    }
  }

  // Print sample of first job to see full field list
  const firstEntry = Object.entries(data.data as Record<string, any>)[0];
  if (firstEntry) {
    console.log("\nSample job (all fields):");
    console.log(JSON.stringify(firstEntry, null, 2));
  }
}

run().catch(console.error);
