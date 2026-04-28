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

type StubOptions = {
  /** Hvis satt, kaster `createMany` med denne feilen. Brukes til atomisitetstest. */
  createManyThrows?: Error;
};

function createStub(options: StubOptions = {}): {
  client: ChangeLogClient;
  state: StubState;
} {
  const state: StubState = {
    logs: [],
    entries: [],
    nextLogId: 1,
    nextEntryId: 1,
    createCalls: [],
    createManyCalls: [],
  };

  // Vi bygger en transaksjonell stub som etterligner Prismas
  // `$transaction(fn)`-API: callbacken får en klient bundet til transaksjonen,
  // og hvis den kaster ruller vi tilbake alle skrivinger som ble gjort.
  // Implementasjonen tar et øyeblikksbilde før callbacken kjører og
  // restaurerer det hvis vi feiler.
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
        if (options.createManyThrows) {
          // Vi registrerer kallet før vi kaster, så testen kan verifisere at
          // det faktisk ble forsøkt.
          state.createManyCalls.push(args);
          throw options.createManyThrows;
        }
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
    async $transaction<T>(fn: (tx: ChangeLogClient) => Promise<T>): Promise<T> {
      // Snapshot før transaksjonen — vi gjenoppretter ved feil. I produksjon
      // vil Prisma håndtere dette via SQL-transaksjonen; i stuben emulerer
      // vi semantikken slik at testene faktisk kan demonstrere atomisitet.
      const snapshot = {
        logs: state.logs.map((l) => ({ ...l })),
        entries: state.entries.map((e) => ({ ...e })),
        nextLogId: state.nextLogId,
        nextEntryId: state.nextEntryId,
      };
      try {
        return await fn(client);
      } catch (err) {
        state.logs.length = 0;
        state.logs.push(...snapshot.logs);
        state.entries.length = 0;
        state.entries.push(...snapshot.entries);
        state.nextLogId = snapshot.nextLogId;
        state.nextEntryId = snapshot.nextEntryId;
        throw err;
      }
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

test("recordChange ruller tilbake hele logginnsettelsen hvis createMany feiler", async () => {
  // Reproduserer C1: hvis createMany kaster etter at parent-loggen er
  // opprettet, skal transaksjonen rulle tilbake parent-loggen også. Uten
  // $transaction ville vi etterlatt en foreldreløs ChangeLog-rad.
  const failure = new Error("createMany feilet (simulert DB-feil)");
  const { client, state } = createStub({ createManyThrows: failure });

  await assert.rejects(
    () =>
      recordChange(client, {
        actorType: "USER",
        actorId: "user_1",
        source: "USER_ACTION",
        summary: "Skal feile",
        entries: [
          { model: "Personnel", recordId: "p1", field: "email", oldValue: "a", newValue: "b" },
        ],
      }),
    /createMany feilet/
  );

  // createMany skal ha blitt forsøkt (én gang), men ingenting skal være
  // persistert: verken parent-loggen eller entries.
  assert.equal(state.createCalls.length, 1, "changeLog.create skal ha blitt kalt");
  assert.equal(state.createManyCalls.length, 1, "createMany skal ha blitt forsøkt");
  assert.equal(state.logs.length, 0, "ingen ChangeLog-rader skal være persistert");
  assert.equal(state.entries.length, 0, "ingen entries skal være persistert");
});
