import assert from "node:assert/strict";
import test from "node:test";

import { recordChange } from "./record-change";
import type {
  ChangeLogClient,
  ChangeLogEntryRow,
  ChangeLogRow,
  CreateChangeLogArgs,
  CreateChangeLogEntriesArgs,
} from "./types";

// ─── Hjelpere for in-memory stub av ChangeLogClient ──────────────

type StubState = {
  logs: ChangeLogRow[];
  entries: ChangeLogEntryRow[];
  nextLogId: number;
  nextEntryId: number;
  createCalls: CreateChangeLogArgs[];
  createManyCalls: CreateChangeLogEntriesArgs[];
};

function createStub(): { client: ChangeLogClient; state: StubState } {
  const state: StubState = {
    logs: [],
    entries: [],
    nextLogId: 1,
    nextEntryId: 1,
    createCalls: [],
    createManyCalls: [],
  };

  const client: ChangeLogClient = {
    changeLog: {
      async create(args) {
        state.createCalls.push(args);
        const row: ChangeLogRow = {
          id: `log_${state.nextLogId++}`,
          actorType: args.data.actorType,
          actorId: args.data.actorId ?? null,
          actorName: args.data.actorName ?? null,
          source: args.data.source,
          summary: args.data.summary ?? null,
          runId: args.data.runId ?? null,
          createdAt: new Date("2026-04-28T10:00:00Z"),
        };
        state.logs.push(row);
        return row;
      },
    },
    changeLogEntry: {
      async createMany(args) {
        state.createManyCalls.push(args);
        for (const entry of args.data) {
          state.entries.push({
            id: `entry_${state.nextEntryId++}`,
            changeLogId: entry.changeLogId,
            model: entry.model,
            recordId: entry.recordId,
            field: entry.field,
            oldValue: entry.oldValue,
            newValue: entry.newValue,
            rolledBackAt: null,
            createdAt: new Date("2026-04-28T10:00:00Z"),
          });
        }
        return { count: args.data.length };
      },
      async findMany(args) {
        return state.entries.filter((entry) => {
          if (args.where.id !== undefined && entry.id !== args.where.id) return false;
          if (
            args.where.changeLogId !== undefined &&
            entry.changeLogId !== args.where.changeLogId
          ) {
            return false;
          }
          if (args.where.rolledBackAt === null && entry.rolledBackAt !== null) {
            return false;
          }
          return true;
        });
      },
      async update() {
        throw new Error("not used in record-change tests");
      },
    },
  };

  return { client, state };
}

// ─── Tester ──────────────────────────────────────────────────────

test("recordChange logger en enkel feltendring fra USER", async () => {
  const { client, state } = createStub();

  const result = await recordChange(client, {
    actorType: "USER",
    actorId: "user_42",
    actorName: "Eric Molnes",
    source: "USER_ACTION",
    summary: "Endret e-post",
    entries: [
      {
        model: "Personnel",
        recordId: "p1",
        field: "email",
        oldValue: "old@example.com",
        newValue: "new@example.com",
      },
    ],
  });

  assert.equal(state.logs.length, 1);
  assert.equal(state.logs[0].actorType, "USER");
  assert.equal(state.logs[0].actorId, "user_42");
  assert.equal(state.logs[0].actorName, "Eric Molnes");
  assert.equal(state.logs[0].source, "USER_ACTION");
  assert.equal(state.logs[0].summary, "Endret e-post");

  assert.equal(state.entries.length, 1);
  assert.equal(state.entries[0].model, "Personnel");
  assert.equal(state.entries[0].recordId, "p1");
  assert.equal(state.entries[0].field, "email");
  assert.equal(state.entries[0].oldValue, "old@example.com");
  assert.equal(state.entries[0].newValue, "new@example.com");
  assert.equal(state.entries[0].changeLogId, state.logs[0].id);

  assert.equal(result.changeLogId, state.logs[0].id);
  assert.deepEqual(result.entryIds, [state.entries[0].id]);
});

test("recordChange støtter actorType=AI med runId", async () => {
  const { client, state } = createStub();

  await recordChange(client, {
    actorType: "AI",
    actorId: "ai_run_1",
    actorName: "NRT-assistent",
    source: "AI_ASSISTANT",
    runId: "run_abc",
    entries: [
      {
        model: "Customer",
        recordId: "c1",
        field: "name",
        oldValue: "Gammel AS",
        newValue: "Ny AS",
      },
    ],
  });

  assert.equal(state.logs[0].actorType, "AI");
  assert.equal(state.logs[0].source, "AI_ASSISTANT");
  assert.equal(state.logs[0].runId, "run_abc");
});

test("recordChange grupperer flere endringer under samme changeLog", async () => {
  const { client, state } = createStub();

  const result = await recordChange(client, {
    actorType: "USER",
    actorId: "user_1",
    source: "USER_ACTION",
    entries: [
      { model: "Personnel", recordId: "p1", field: "email", oldValue: "a@x", newValue: "b@x" },
      { model: "Personnel", recordId: "p1", field: "phone", oldValue: "111", newValue: "222" },
      { model: "Customer", recordId: "c1", field: "name", oldValue: "X", newValue: "Y" },
    ],
  });

  assert.equal(state.logs.length, 1);
  assert.equal(state.entries.length, 3);
  assert.equal(result.entryIds.length, 3);
  for (const entry of state.entries) {
    assert.equal(entry.changeLogId, result.changeLogId);
  }
});

test("recordChange håndterer JSON-verdier i oldValue/newValue", async () => {
  const { client, state } = createStub();

  const oldVal = { tags: ["a", "b"], active: true };
  const newVal = { tags: ["a", "b", "c"], active: false };

  await recordChange(client, {
    actorType: "USER",
    source: "USER_ACTION",
    entries: [
      { model: "Project", recordId: "pr1", field: "metadata", oldValue: oldVal, newValue: newVal },
    ],
  });

  assert.deepEqual(state.entries[0].oldValue, oldVal);
  assert.deepEqual(state.entries[0].newValue, newVal);
});

test("recordChange kaster når entries-listen er tom", async () => {
  const { client } = createStub();

  await assert.rejects(
    () =>
      recordChange(client, {
        actorType: "USER",
        source: "USER_ACTION",
        entries: [],
      }),
    /minst én endring/i
  );
});

test("recordChange kaster ved ugyldig actorType", async () => {
  const { client } = createStub();

  await assert.rejects(
    () =>
      recordChange(client, {
        // @ts-expect-error — vi tester runtime-validering med ugyldig verdi
        actorType: "ROBOT",
        source: "USER_ACTION",
        entries: [
          { model: "X", recordId: "1", field: "f", oldValue: 1, newValue: 2 },
        ],
      }),
    /actorType/i
  );
});

test("recordChange normaliserer udefinerte felter til null", async () => {
  const { client, state } = createStub();

  await recordChange(client, {
    actorType: "AI",
    source: "AI_ASSISTANT",
    entries: [
      { model: "X", recordId: "1", field: "f", oldValue: null, newValue: 1 },
    ],
  });

  assert.equal(state.logs[0].actorId, null);
  assert.equal(state.logs[0].actorName, null);
  assert.equal(state.logs[0].summary, null);
  assert.equal(state.logs[0].runId, null);
});
