import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultAssistantActionRegistry,
  runAssistantAction,
} from "./run-assistant-action";
import {
  ASSISTANT_ACTIONS,
  type AssistantActionId,
} from "./resolve-user-capabilities";

function createFakeAiActionRunClient() {
  const creates: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];

  return {
    creates,
    updates,
    client: {
      aiActionRun: {
        async create(args: { data: Record<string, unknown> }) {
          creates.push(args.data);
          return { id: `run-${creates.length}` };
        },
        async update(args: {
          where: { id: string };
          data: Record<string, unknown>;
        }) {
          updates.push(args);
          return { id: args.where.id };
        },
      },
    },
  };
}

function parseSummary(value: unknown) {
  return JSON.parse(String(value)) as {
    actionId: string;
    decision: string;
    reason?: string;
    handlerSummary?: string;
  };
}

test("default registry has approved production handlers for every assistant action", () => {
  for (const actionId of Object.keys(ASSISTANT_ACTIONS) as AssistantActionId[]) {
    assert.equal(
      typeof defaultAssistantActionRegistry[actionId],
      "function",
      `${actionId} must have a default handler`
    );
  }
});

test("rejects actions outside the user's capability set and does not call handlers", async () => {
  const db = createFakeAiActionRunClient();
  let handlerCalled = false;

  const result = await runAssistantAction({
    accessLevel: "USER",
    actionId: "settings.aiModel.update",
    mode: "AUTO",
    prompt: "Bytt modell",
    user: { id: "user-1", name: "User One" },
    client: db.client,
    registry: {
      "settings.aiModel.update": async () => {
        handlerCalled = true;
        return { summary: "changed" };
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "ACTION_NOT_ALLOWED");
  assert.equal(handlerCalled, false);
  assert.equal(db.creates.length, 1);
  assert.equal(db.creates[0].status, "FAILED");
  assert.deepEqual(parseSummary(db.creates[0].summary), {
    actionId: "settings.aiModel.update",
    decision: "rejected",
    reason: "ACTION_NOT_ALLOWED",
  });
  assert.equal(db.updates.length, 0);
});

test("rejects unknown action ids before invoking any handler", async () => {
  const db = createFakeAiActionRunClient();
  let handlerCalled = false;

  const result = await runAssistantAction({
    accessLevel: "ADMIN",
    actionId: "unknown.action",
    mode: "ASK",
    prompt: "Kjor noe",
    user: { id: "admin-1", name: "Admin One" },
    client: db.client,
    registry: {
      ["unknown.action" as AssistantActionId]: async () => {
        handlerCalled = true;
        return { summary: "should not happen" };
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "UNKNOWN_ACTION");
  assert.equal(handlerCalled, false);
  assert.equal(db.creates.length, 1);
  assert.equal(db.creates[0].status, "FAILED");
  assert.deepEqual(parseSummary(db.creates[0].summary), {
    actionId: "unknown.action",
    decision: "rejected",
    reason: "UNKNOWN_ACTION",
  });
  assert.match(String(db.creates[0].errorMessage), /Unknown assistant action/);
});

test("rejects approved actions without a registered handler", async () => {
  const db = createFakeAiActionRunClient();

  const result = await runAssistantAction({
    accessLevel: "ADMIN",
    actionId: "settings.aiModel.update",
    mode: "AUTO",
    prompt: "Bytt modell",
    user: { id: "admin-1", name: "Admin One" },
    client: db.client,
    registry: {},
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "NO_HANDLER");
  assert.equal(db.creates.length, 1);
  assert.equal(db.creates[0].status, "FAILED");
  assert.deepEqual(parseSummary(db.creates[0].summary), {
    actionId: "settings.aiModel.update",
    decision: "rejected",
    reason: "NO_HANDLER",
  });
  assert.equal(db.updates.length, 0);
});

test("runs approved handlers and updates the action run to completed", async () => {
  const db = createFakeAiActionRunClient();
  let receivedPayload: unknown;

  const result = await runAssistantAction({
    accessLevel: "ADMIN",
    actionId: "settings.aiModel.update",
    mode: "AUTO",
    prompt: "Bytt modell",
    payload: { model: "claude-sonnet-4-6-20250514" },
    user: { id: "admin-1", name: "Admin One" },
    client: db.client,
    registry: {
      "settings.aiModel.update": async ({ payload }) => {
        receivedPayload = payload;
        return { summary: "AI model updated", data: { ok: true } };
      },
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(receivedPayload, { model: "claude-sonnet-4-6-20250514" });
  assert.equal(db.creates.length, 1);
  assert.equal(db.creates[0].status, "RUNNING");
  assert.match(String(db.creates[0].summary), /settings\.aiModel\.update/);
  assert.equal(db.updates.length, 1);
  assert.equal(db.updates[0].where.id, "run-1");
  assert.match(
    String((db.updates[0].data as Record<string, unknown>).summary),
    /settings\.aiModel\.update/
  );
  assert.match(
    String((db.updates[0].data as Record<string, unknown>).summary),
    /AI model updated/
  );
  assert.equal(
    (db.updates[0].data as Record<string, unknown>).status,
    "COMPLETED"
  );
});

test("updates accepted action runs to failed when an approved handler throws", async () => {
  const db = createFakeAiActionRunClient();

  const result = await runAssistantAction({
    accessLevel: "ADMIN",
    actionId: "syncConflict.resolve",
    mode: "AUTO",
    prompt: "Los konflikt",
    user: { id: "admin-1", name: "Admin One" },
    client: db.client,
    registry: {
      "syncConflict.resolve": async () => {
        throw new Error("Conflict no longer exists");
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "HANDLER_FAILED");
  assert.equal(db.creates.length, 1);
  assert.equal(db.creates[0].status, "RUNNING");
  assert.equal(db.updates.length, 1);
  assert.equal(
    (db.updates[0].data as Record<string, unknown>).status,
    "FAILED"
  );
  assert.match(
    String((db.updates[0].data as Record<string, unknown>).errorMessage),
    /Conflict no longer exists/
  );
});
