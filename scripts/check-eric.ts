import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// Simulate what sync does for certification mapping
const API_KEY = process.env.RECMAN_API_KEY!;
const API_URL = process.env.RECMAN_API_URL || "https://api.recman.io";

async function main() {
  // Fetch from Recman API with new field name
  const params = new URLSearchParams({
    key: API_KEY,
    scope: "candidate",
    fields: "firstName,lastName,certification",
    candidateIds: "7065380",
  });
  const url = `${API_URL}/v2/get/?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.success) {
    const candidate = data.data["7065380"];
    const certs = candidate.certification || [];
    console.log(`Found ${certs.length} certifications for ${candidate.firstName} ${candidate.lastName}`);

    // Map to internal format (same logic as sync.ts)
    const mapped = certs.map((c: any) => ({
      courseId: c.certificationId,
      name: c.name,
      expiryDate: c.endDate || undefined,
      description: c.description || undefined,
      verified: false,
      files: (c.files ?? []).map((f: any) => ({
        fileId: String(f.candidateFileId || f.certificationFileId),
        fileName: f.name,
        url: "",
      })),
    }));

    console.log("\nMapped courses:");
    for (const m of mapped) {
      console.log(`  - ${m.name} (expires: ${m.expiryDate || "N/A"}, files: ${m.files.length})`);
    }
  }

  await db.$disconnect();
}

main();
