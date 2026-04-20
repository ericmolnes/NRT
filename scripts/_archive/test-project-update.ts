import { config } from "dotenv";
config({ path: ".env.local" });

const API_KEY = process.env.RECMAN_API_KEY!;
const API_URL = process.env.RECMAN_API_URL || "https://api.recman.io";

async function run() {
  // Fetch one project with companyId
  const p = new URLSearchParams({ key: API_KEY, scope: "project", fields: "name,holidayRate,companyId", page: "1" });
  const res = await fetch(`${API_URL}/v2/get/?${p}`);
  const data = await res.json();
  const entries = Object.entries(data.data as Record<string, any>).slice(0, 1);
  for (const [id, proj] of entries) {
    console.log("Project:", id, JSON.stringify(proj));
  }

  const [testId, testProj] = entries[0] as [string, any];
  console.log(`\nTesting update on projectId=${testId} companyId=${testProj.companyId}`);

  // Try 1: with companyId + string value
  const r1 = await fetch(`${API_URL}/v2/post/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: API_KEY, scope: "project", operation: "update", data: { projectId: testId, companyId: testProj.companyId, holidayRate: "12.00" } })
  });
  console.log("1. companyId + string '12.00':", JSON.stringify(await r1.json()));

  // Try 2: projectId as int
  const r2 = await fetch(`${API_URL}/v2/post/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: API_KEY, scope: "project", operation: "update", data: { projectId: parseInt(testId), holidayRate: 12 } })
  });
  console.log("2. projectId int + number 12:", JSON.stringify(await r2.json()));

  // Try 3: float
  const r3 = await fetch(`${API_URL}/v2/post/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: API_KEY, scope: "project", operation: "update", data: { projectId: parseInt(testId), companyId: testProj.companyId, holidayRate: 12.00 } })
  });
  console.log("3. all int + float 12.00:", JSON.stringify(await r3.json()));
}
run().catch(console.error);
