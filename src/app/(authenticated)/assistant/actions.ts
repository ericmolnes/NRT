"use server";

import { resolveAccessForUser } from "@/lib/access/get-current-access";
import {
  runAssistantAction,
  type AssistantActionMode,
  type RunAssistantActionResult,
} from "@/lib/assistant/run-assistant-action";
import { auth } from "@/lib/auth";

type PromptActionInput = {
  actionId: "assistant.plan" | "assistant.ask";
  mode: Extract<AssistantActionMode, "PLAN" | "ASK">;
  prompt: string;
};

async function getAssistantUserContext() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");

  const access = await resolveAccessForUser(session.user);
  return {
    accessLevel: access.level,
    user: {
      id: session.user.id,
      name: session.user.name ?? null,
    },
  };
}

export async function runAssistantPromptAction(
  input: PromptActionInput
): Promise<RunAssistantActionResult> {
  const context = await getAssistantUserContext();
  return runAssistantAction({
    accessLevel: context.accessLevel,
    actionId: input.actionId,
    mode: input.mode,
    prompt: input.prompt,
    user: context.user,
  });
}

export async function runAssistantResolveSyncConflictAction(
  conflictId: string,
  resolution: "KEEP_LOCAL" | "KEEP_REMOTE"
): Promise<{ ok: boolean; errorMessage?: string } | undefined> {
  const context = await getAssistantUserContext();
  const result = await runAssistantAction({
    accessLevel: context.accessLevel,
    actionId: "syncConflict.resolve",
    mode: "ASK",
    prompt: `Resolve sync conflict ${conflictId}`,
    payload: { conflictId, resolution },
    user: context.user,
  });
  return result.ok ? { ok: true } : { ok: false, errorMessage: result.errorMessage };
}

export async function runAssistantIgnoreSyncConflictAction(
  conflictId: string
): Promise<{ ok: boolean; errorMessage?: string } | undefined> {
  const context = await getAssistantUserContext();
  const result = await runAssistantAction({
    accessLevel: context.accessLevel,
    actionId: "syncConflict.ignore",
    mode: "ASK",
    prompt: `Ignore sync conflict ${conflictId}`,
    payload: { conflictId },
    user: context.user,
  });
  return result.ok ? { ok: true } : { ok: false, errorMessage: result.errorMessage };
}
