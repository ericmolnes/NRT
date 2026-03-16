import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { z } from "zod/v4";
import {
  WORK_PACKAGE_SYSTEM_PROMPT,
  WORK_PACKAGE_USER_PROMPT,
} from "./parsing-prompt";

// ─── Output schema ──────────────────────────────────────────────────

const cableSchema = z.object({
  tagNumber: z.string().nullable().optional(),
  cableType: z.string(),
  fromLocation: z.string().nullable().optional(),
  toLocation: z.string().nullable().optional(),
  lengthMeters: z.number(),
  sizeCategory: z.string().nullable().optional(),
});

const equipmentSchema = z.object({
  tagNumber: z.string().nullable().optional(),
  name: z.string(),
  type: z.string(),
  action: z.string(),
  quantity: z.number().default(1),
});

const scopeItemSchema = z.object({
  description: z.string(),
  discipline: z.enum(["ELECTRICAL", "INSTRUMENT", "ENGINEERING"]),
  quantity: z.number().default(1),
  unit: z.string().default("stk"),
});

const assumptionSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const parseResultSchema = z.object({
  projectName: z.string(),
  projectNumber: z.string().nullable().optional(),
  cables: z.array(cableSchema),
  equipment: z.array(equipmentSchema),
  scopeItems: z.array(scopeItemSchema),
  assumptions: z.array(assumptionSchema).optional(),
});

export type ParseResult = z.infer<typeof parseResultSchema>;

// ─── Text extraction ────────────────────────────────────────────────

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// ─── AI parsing ─────────────────────────────────────────────────────

export async function parseWorkPackageWithAI(
  documentText: string
): Promise<{ result: ParseResult; rawOutput: string; confidence: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY er ikke satt");
  }

  const client = new Anthropic({ apiKey });

  // Trim dokumentet til maks ~100K tegn for a holde seg innenfor kontekstvindu
  const trimmedText =
    documentText.length > 100000
      ? documentText.substring(0, 100000) + "\n\n[...dokument avkortet...]"
      : documentText;

  const userPrompt = WORK_PACKAGE_USER_PROMPT.replace(
    "{DOCUMENT_TEXT}",
    trimmedText
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: WORK_PACKAGE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Hent tekst-innhold fra responsen
  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Ingen tekstrespons fra AI");
  }

  const rawOutput = textContent.text;

  // Ekstraher JSON fra responsen (kan vaere wrappet i markdown code block)
  const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    rawOutput.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("Kunne ikke finne JSON i AI-respons");
  }

  const parsed = JSON.parse(jsonMatch[1]);
  const validated = parseResultSchema.parse(parsed);

  // Beregn en enkel confidence basert pa mengden data som ble funnet
  const totalItems =
    validated.cables.length +
    validated.equipment.length +
    validated.scopeItems.length;
  const confidence = Math.min(totalItems / 10, 1); // 10+ items = 100%

  return {
    result: validated,
    rawOutput,
    confidence,
  };
}

// Re-export from canonical cable classifier to avoid duplication
export { classifyCableSize } from "@/lib/estimering/cable-classifier";
