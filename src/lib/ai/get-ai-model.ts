import { db } from "@/lib/db";

const DEFAULT_MODEL = "claude-opus-4-6-20250219";
const ALLOWED_MODELS = [
  "claude-opus-4-6-20250219",
  "claude-sonnet-4-6-20250514",
  "claude-haiku-4-5-20251001",
] as const;

export type AiModel = (typeof ALLOWED_MODELS)[number];

export async function getAiModel(): Promise<AiModel> {
  try {
    const setting = await db.appSetting.findUnique({
      where: { key: "ai_model" },
    });
    if (setting && ALLOWED_MODELS.includes(setting.value as AiModel)) {
      return setting.value as AiModel;
    }
  } catch {
    // Table might not exist yet or other error
  }
  return DEFAULT_MODEL;
}

export { ALLOWED_MODELS, DEFAULT_MODEL };
