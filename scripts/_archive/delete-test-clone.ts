/**
 * Sletter en testjobb etter verifisering.
 * Kjør: npx dotenvx run -f .env.local -- npx tsx scripts/delete-test-clone.ts <jobId>
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const KEY = process.env.RECMAN_API_KEY!;
const BASE = process.env.RECMAN_API_URL || "https://api.recman.io";
const jobId = process.argv[2];

if (!jobId) {
  console.error("Bruk: npx tsx scripts/delete-test-clone.ts <jobId>");
  process.exit(1);
}

async function main() {
  const res = await fetch(`${BASE}/v2/post/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: KEY, scope: "job", operation: "delete", data: { jobId } }),
  });
  const d = await res.json();
  if (d.success) {
    console.log(`✓ Jobb ${jobId} slettet.`);
  } else {
    console.error(`✗ Feil:`, JSON.stringify(d));
  }
}

main().catch(console.error);
