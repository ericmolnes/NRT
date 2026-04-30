import { db } from "@/lib/db";
import type { AccessLevel } from "@/lib/access/get-current-access";
import {
  isAssistantActionId,
  resolveUserCapabilities,
  type AssistantActionId,
} from "./resolve-user-capabilities";

export type AssistantActionMode = "PLAN" | "ASK" | "AUTO" | "ADMIN_BYPASS";
export type AssistantActionStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type AssistantActionUser = {
  id?: string | null;
  name?: string | null;
};

export type AssistantActionHandlerContext = {
  actionId: AssistantActionId;
  mode: AssistantActionMode;
  prompt: string;
  payload?: unknown;
  user: AssistantActionUser;
};

export type AssistantActionHandlerResult = {
  summary?: string;
  data?: unknown;
};

export type AssistantActionHandler = (
  context: AssistantActionHandlerContext
) => Promise<AssistantActionHandlerResult>;

export type AssistantActionRegistry = Partial<
  Record<AssistantActionId, AssistantActionHandler>
>;

export type AiActionRunClient = {
  aiActionRun: {
    create(args: {
      data: {
        userId?: string | null;
        userName?: string | null;
        mode: AssistantActionMode;
        prompt?: string | null;
        summary?: string | null;
        status: AssistantActionStatus;
        errorMessage?: string | null;
        completedAt?: Date | null;
      };
    }): Promise<{ id: string }>;
    update(args: {
      where: { id: string };
      data: {
        summary?: string | null;
        status?: AssistantActionStatus;
        errorMessage?: string | null;
        completedAt?: Date | null;
      };
    }): Promise<unknown>;
  };
};

export type RunAssistantActionInput = {
  accessLevel: AccessLevel;
  actionId: string;
  mode: AssistantActionMode;
  prompt: string;
  payload?: unknown;
  user: AssistantActionUser;
  client?: AiActionRunClient;
  registry?: AssistantActionRegistry;
};

export type RunAssistantActionResult =
  | {
      ok: true;
      actionRunId: string;
      summary?: string;
      data?: unknown;
    }
  | {
      ok: false;
      reason: "UNKNOWN_ACTION" | "ACTION_NOT_ALLOWED" | "NO_HANDLER" | "HANDLER_FAILED";
      actionRunId: string;
      errorMessage: string;
    };

export const defaultAssistantActionRegistry: AssistantActionRegistry = {};

function actionSummary(input: {
  actionId: string;
  decision: "accepted" | "rejected";
  reason?: string;
  handlerSummary?: string;
}): string {
  return JSON.stringify(input);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function createFailedRun(
  client: AiActionRunClient,
  input: RunAssistantActionInput,
  reason: "UNKNOWN_ACTION" | "ACTION_NOT_ALLOWED" | "NO_HANDLER",
  message: string
): Promise<RunAssistantActionResult> {
  const run = await client.aiActionRun.create({
    data: {
      userId: input.user.id ?? null,
      userName: input.user.name ?? null,
      mode: input.mode,
      prompt: input.prompt,
      summary: actionSummary({
        actionId: input.actionId,
        decision: "rejected",
        reason,
      }),
      status: "FAILED",
      errorMessage: message,
      completedAt: new Date(),
    },
  });

  return {
    ok: false,
    reason,
    actionRunId: run.id,
    errorMessage: message,
  };
}

export async function runAssistantAction(
  input: RunAssistantActionInput
): Promise<RunAssistantActionResult> {
  const client = input.client ?? (db as unknown as AiActionRunClient);
  const registry = input.registry ?? defaultAssistantActionRegistry;

  if (!isAssistantActionId(input.actionId)) {
    return createFailedRun(
      client,
      input,
      "UNKNOWN_ACTION",
      `Unknown assistant action: ${input.actionId}`
    );
  }

  const capabilities = resolveUserCapabilities(input.accessLevel);
  if (!capabilities.allowedActionIds.includes(input.actionId)) {
    return createFailedRun(
      client,
      input,
      "ACTION_NOT_ALLOWED",
      `Action ${input.actionId} is not allowed for ${input.accessLevel} access`
    );
  }

  const handler = registry[input.actionId];
  if (!handler) {
    return createFailedRun(
      client,
      input,
      "NO_HANDLER",
      `No approved handler is registered for assistant action: ${input.actionId}`
    );
  }

  const run = await client.aiActionRun.create({
    data: {
      userId: input.user.id ?? null,
      userName: input.user.name ?? null,
      mode: input.mode,
      prompt: input.prompt,
      summary: actionSummary({
        actionId: input.actionId,
        decision: "accepted",
      }),
      status: "RUNNING",
    },
  });

  try {
    const result = await handler({
      actionId: input.actionId,
      mode: input.mode,
      prompt: input.prompt,
      payload: input.payload,
      user: input.user,
    });
    const summary = actionSummary({
      actionId: input.actionId,
      decision: "accepted",
      handlerSummary: result.summary,
    });

    await client.aiActionRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        summary,
        completedAt: new Date(),
      },
    });

    return {
      ok: true,
      actionRunId: run.id,
      summary,
      data: result.data,
    };
  } catch (error) {
    const message = errorMessage(error);
    await client.aiActionRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    return {
      ok: false,
      reason: "HANDLER_FAILED",
      actionRunId: run.id,
      errorMessage: message,
    };
  }
}
