/**
 * Exploration script to discover all available Recman API scopes and fields.
 * Run with: npx dotenvx run -f .env.local -- npx tsx scripts/explore-recman-api.ts
 */

const API_KEY = process.env.RECMAN_API_KEY;
const API_URL = process.env.RECMAN_API_URL || "https://api.recman.io";

if (!API_KEY) {
  console.error("RECMAN_API_KEY is not set");
  process.exit(1);
}

// Known Recman API scopes to test
const SCOPES_TO_TEST = [
  "customer",
  "mission",
  "department",
  "corporation",
  "project",
  "shift",
  "workCalendar",
  "invoice",
  "contract",
  "agreement",
  "jobApplication",
  "interview",
  "reference",
  "vacancy",
  "placement",
  "timesheet",
  "expense",
];

async function testScope(scope: string): Promise<void> {
  try {
    const params = new URLSearchParams({
      key: API_KEY!,
      scope,
      fields: "*", // Try wildcard first
    });

    let url = `${API_URL}/v2/get/?${params.toString()}`;
    let res = await fetch(url);

    // If wildcard doesn't work, try without fields
    if (!res.ok) {
      const params2 = new URLSearchParams({
        key: API_KEY!,
        scope,
        fields: "id,name",
      });
      url = `${API_URL}/v2/get/?${params2.toString()}`;
      res = await fetch(url);
    }

    if (!res.ok) {
      console.log(`  ❌ ${scope}: HTTP ${res.status} ${res.statusText}`);
      return;
    }

    const data = await res.json();

    if (!data.success) {
      const errorMsg = data.error?.[0]?.message || JSON.stringify(data.error);
      console.log(`  ❌ ${scope}: ${errorMsg}`);
      return;
    }

    const numRows = data.numRows ?? 0;
    console.log(`  ✅ ${scope}: ${numRows} records`);

    // Show first record's fields
    if (data.data) {
      const entries = Object.entries(data.data);
      if (entries.length > 0) {
        const [id, record] = entries[0];
        console.log(`     ID: ${id}`);
        if (typeof record === "object" && record !== null) {
          const fields = Object.keys(record as Record<string, unknown>);
          console.log(`     Fields (${fields.length}): ${fields.join(", ")}`);

          // Show sample values for key fields
          const rec = record as Record<string, unknown>;
          for (const field of fields.slice(0, 15)) {
            const val = rec[field];
            const valStr = typeof val === "object" ? JSON.stringify(val)?.slice(0, 80) : String(val ?? "null");
            console.log(`       ${field}: ${valStr}`);
          }
          if (fields.length > 15) {
            console.log(`       ... and ${fields.length - 15} more fields`);
          }
        }
      }
    }
  } catch (err) {
    console.log(`  ❌ ${scope}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  console.log("=== Recman API Scope Exploration ===");
  console.log(`API URL: ${API_URL}`);
  console.log(`Testing ${SCOPES_TO_TEST.length} scopes...\n`);

  for (const scope of SCOPES_TO_TEST) {
    await testScope(scope);
    console.log();
  }

  console.log("=== Done ===");
}

main().catch(console.error);
