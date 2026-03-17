"use server";

import { auth } from "@/lib/auth";
import { assertAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ALLOWED_MODELS, type AiModel } from "@/lib/ai/get-ai-model";

export async function saveAiModel(model: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");
  await assertAdmin();

  if (!ALLOWED_MODELS.includes(model as AiModel)) {
    return { success: false };
  }

  await db.appSetting.upsert({
    where: { key: "ai_model" },
    update: { value: model },
    create: { key: "ai_model", value: model },
  });

  return { success: true };
}
