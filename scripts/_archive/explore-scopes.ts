import { config } from "dotenv";
config({ path: ".env.local" });

const KEY = process.env.RECMAN_API_KEY!;
const URL = process.env.RECMAN_API_URL || "https://api.recman.io";

const scopes = [
  "collectiveAgreement",
  "colectiveAgreement",
  "agreement",
  "salary",
  "employment",
  "employmentType",
  "paymentType",
  "wage",
  "tariff",
];

async function run() {
  for (const scope of scopes) {
    const p = new URLSearchParams({ key: KEY, scope, page: "1" });
    const res = await fetch(`${URL}/v2/get/?${p}`);
    const data = await res.json();
    if (data.success) {
      const sample = Object.values(data.data || {})[0];
      console.log(`FOUND: ${scope} (numRows=${data.numRows})`);
      if (sample) console.log("  Sample:", JSON.stringify(sample).slice(0, 150));
    } else {
      const msg = data.error?.[0]?.message || data.message || JSON.stringify(data).slice(0, 80);
      console.log(`MISS:  ${scope} - ${msg}`);
    }
  }
}

run().catch(console.error);
