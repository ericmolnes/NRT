import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { getAiModel } from "./get-ai-model";

// ─── Input types ─────────────────────────────────────────────────────

export type ParsedRow = {
  rowIndex: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  city?: string;
  company?: string;
  isContractor?: boolean;
  [key: string]: unknown;
};

export type ExistingCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  title: string | null;
  isEmployee: boolean;
  isContractor: boolean;
};

// ─── Output schema ───────────────────────────────────────────────────

const matchEntrySchema = z.object({
  rowIndex: z.number(),
  matchedCandidateId: z.string().nullable(),
  matchedCandidateName: z.string().nullable(),
  confidence: z.number().min(0).max(100),
  reason: z.string(),
  isEmployee: z.boolean().optional(),
  isContractor: z.boolean().optional(),
});

const matchResultSchema = z.object({
  matches: z.array(matchEntrySchema),
});

export type MatchEntry = z.infer<typeof matchEntrySchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;

// ─── AI prompts ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Du er en navnematchingsassistent for Nordic Rig Tech sitt HR-system.
Du får en liste med navn fra en Excel-import og en liste med eksisterende kandidater i databasen.
Din oppgave er å identifisere hvilke importerte navn som matcher eksisterende kandidater.

Vurder:
- Stavevarianter (Jon/John, Kristian/Christian, Erik/Eric)
- Navnerekkefølge (fornavn/etternavn kan være byttet)
- Norske navnekonvensjoner (Hansen/Hanssen, Olsen/Olson, Berge/Berg)
- Mellomnavn (kan finnes i en kilde men ikke den andre)
- Delvise matcher (kun etternavn matcher + lignende fornavn)

For HVER importert navn, returner:
- matchedCandidateId: ID-en til den matchende kandidaten, eller null hvis ingen match
- matchedCandidateName: Fullt navn på matchet kandidat, eller null
- confidence: 0-100 der 100 er sikker match
- reason: Kort forklaring på norsk

Returner BARE gyldig JSON. Ingen forklaring utenfor JSON.`;

// ─── Helpers ─────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

const MAX_AI_CANDIDATES = 500;

/** Pre-filter existing candidates to only those plausibly similar to import rows. */
function preFilterCandidates(
  rows: ParsedRow[],
  candidates: ExistingCandidate[]
): ExistingCandidate[] {
  // Collect first 2 chars of each last name and first name from import rows
  const prefixes = new Set<string>();
  for (const row of rows) {
    const ln = normalize(row.lastName);
    const fn = normalize(row.firstName);
    if (ln.length >= 2) prefixes.add(ln.slice(0, 2));
    if (ln.length >= 3) prefixes.add(ln.slice(0, 3));
    if (fn.length >= 2) prefixes.add(fn.slice(0, 2));
  }

  // Keep candidates whose first or last name shares a prefix
  const filtered = candidates.filter((c) => {
    const ln = normalize(c.lastName);
    const fn = normalize(c.firstName);
    return (
      (ln.length >= 2 && prefixes.has(ln.slice(0, 2))) ||
      (ln.length >= 3 && prefixes.has(ln.slice(0, 3))) ||
      (fn.length >= 2 && prefixes.has(fn.slice(0, 2)))
    );
  });

  // Cap at MAX_AI_CANDIDATES to prevent excessive prompt size
  return filtered.slice(0, MAX_AI_CANDIDATES);
}

// ─── Main matching function ──────────────────────────────────────────

export async function matchCandidatesWithAI(
  parsedRows: ParsedRow[],
  existingCandidates: ExistingCandidate[]
): Promise<MatchResult> {
  const results: MatchEntry[] = [];
  const unmatchedRows: ParsedRow[] = [];

  // Build lookup maps for deterministic matching
  const emailMap = new Map<string, ExistingCandidate>();
  const nameMap = new Map<string, ExistingCandidate>();

  for (const candidate of existingCandidates) {
    if (candidate.email) {
      emailMap.set(normalize(candidate.email), candidate);
    }
    const nameKey = `${normalize(candidate.firstName)}|${normalize(candidate.lastName)}`;
    nameMap.set(nameKey, candidate);
  }

  // ─── Pre-filter: Exact email match ───────────────────────────────
  for (const row of parsedRows) {
    if (row.email) {
      const candidate = emailMap.get(normalize(row.email));
      if (candidate) {
        results.push({
          rowIndex: row.rowIndex,
          matchedCandidateId: candidate.id,
          matchedCandidateName: `${candidate.firstName} ${candidate.lastName}`,
          confidence: 100,
          reason: "Eksakt e-postmatch",
          isEmployee: candidate.isEmployee,
          isContractor: candidate.isContractor,
        });
        continue;
      }
    }

    // ─── Pre-filter: Exact name match ────────────────────────────────
    const nameKey = `${normalize(row.firstName)}|${normalize(row.lastName)}`;
    const candidateByName = nameMap.get(nameKey);
    if (candidateByName) {
      results.push({
        rowIndex: row.rowIndex,
        matchedCandidateId: candidateByName.id,
        matchedCandidateName: `${candidateByName.firstName} ${candidateByName.lastName}`,
        confidence: 95,
        reason: "Eksakt navnematch (fornavn + etternavn)",
        isEmployee: candidateByName.isEmployee,
        isContractor: candidateByName.isContractor,
      });
      continue;
    }

    unmatchedRows.push(row);
  }

  // ─── AI matching for remaining rows ────────────────────────────────
  if (unmatchedRows.length > 0 && existingCandidates.length > 0) {
    // Pre-filter: only send candidates with similar last names to bound prompt size
    const relevantCandidates = preFilterCandidates(unmatchedRows, existingCandidates);
    try {
      const aiMatches = await callAIMatching(unmatchedRows, relevantCandidates);
      results.push(...aiMatches);
    } catch (error) {
      console.warn("[match-candidates] AI-matching feilet, returnerer tomme matcher:", error);
      // Return unmatched rows with 0 confidence
      for (const row of unmatchedRows) {
        results.push({
          rowIndex: row.rowIndex,
          matchedCandidateId: null,
          matchedCandidateName: null,
          confidence: 0,
          reason: "AI-matching feilet",
        });
      }
    }
  } else if (unmatchedRows.length > 0) {
    // No existing candidates to match against
    for (const row of unmatchedRows) {
      results.push({
        rowIndex: row.rowIndex,
        matchedCandidateId: null,
        matchedCandidateName: null,
        confidence: 0,
        reason: "Ingen eksisterende kandidater å matche mot",
      });
    }
  }

  // Sort by original row order
  results.sort((a, b) => a.rowIndex - b.rowIndex);

  return { matches: results };
}

// ─── AI call ─────────────────────────────────────────────────────────

async function callAIMatching(
  rows: ParsedRow[],
  candidates: ExistingCandidate[]
): Promise<MatchEntry[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY er ikke satt");
  }

  const model = await getAiModel();
  const client = new Anthropic({ apiKey });

  const userPrompt = `Importerte navn:
${rows.map((r) => `- [${r.rowIndex}] ${r.firstName} ${r.lastName}${r.email ? ` (${r.email})` : ""}${r.title ? ` - ${r.title}` : ""}`).join("\n")}

Eksisterende kandidater i databasen:
${candidates.map((c) => `- [${c.id}] ${c.firstName} ${c.lastName}${c.email ? ` (${c.email})` : ""}${c.isEmployee ? " [Ansatt]" : ""}${c.isContractor ? " [Innleid]" : ""}`).join("\n")}`;

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Extract text content from response
  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Ingen tekstrespons fra AI");
  }

  const rawOutput = textContent.text;

  // Try to extract JSON (may be wrapped in markdown code block)
  const jsonMatch =
    rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    rawOutput.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("Kunne ikke finne JSON i AI-respons");
  }

  const parsed = JSON.parse(jsonMatch[1]);
  const validated = matchResultSchema.parse(parsed);

  return validated.matches;
}
