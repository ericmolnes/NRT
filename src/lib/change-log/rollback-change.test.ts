import assert from "node:assert/strict";
import test from "node:test";

import { rollbackChange } from "./rollback-change";
import type {
  ChangeLogClient,
  ChangeLogEntryRow,
  ChangeLogRow,
  RollbackApplier,
} from "./types";

// ─── In-memory stub som støtter både record og rollback ──────────

type StubState = {
  logs: ChangeLogRow[];
  entries: ChangeLogEntryRow[];
};

function createStub(seed: ChangeLogEntryRow[]): { client: ChangeLogClient; state: StubState } {
  const state: StubState = {
    logs: [],
    entries: seed.map((entry) => ({ ...entry })),
  };

  const client: ChangeLogClient = {
    changeLog: {
      async create() {
        throw new Error("not used in rollback tests");
      },
    },
    changeLogEntry: {
      async createMany() {
        throw new Error("not used in rollback tests");
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
      async update(args) {
        const entry = state.entries.find((e) => e.id === args.where.id);
        if (!entry) throw new Error(`entry ${args.where.id} ikke funnet`);
        entry.rolledBackAt = args.data.rolledBackAt;
        return entry;
      },
    },
  };

  return { client, state };
}

function makeEntry(partial: Partial<ChangeLogEntryRow>): ChangeLogEntryRow {
  return {
    id: partial.id ?? "entry_1",
    changeLogId: partial.changeLogId ?? "log_1",
    model: partial.model ?? "Personnel",
    recordId: partial.recordId ?? "p1",
    field: partial.field ?? "email",
    oldValue: partial.oldValue ?? "old@example.com",
    newValue: partial.newValue ?? "new@example.com",
    rolledBackAt: partial.rolledBackAt ?? null,
    createdAt: partial.createdAt ?? new Date("2026-04-28T10:00:00Z"),
  };
}

// ─── Tester ──────────────────────────────────────────────────────

test("rollbackChange ruller tilbake en enkelt feltendring", async () => {
  const entry = makeEntry({ id: "entry_1" });
  const { client, state } = createStub([entry]);

  const applied: Array<{ model: string; recordId: string; field: string; value: unknown }> = [];
  const applier: RollbackApplier = async (e) => {
    applied.push({ model: e.model, recordId: e.recordId, field: e.field, value: e.oldValue });
    return true;
  };

  const result = await rollbackChange(client, { entryId: "entry_1" }, applier);

  assert.equal(result.rolledBack, 1);
  assert.deepEqual(result.entryIds, ["entry_1"]);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].model, "Personnel");
  assert.equal(applied[0].recordId, "p1");
  assert.equal(applied[0].field, "email");
  assert.equal(applied[0].value, "old@example.com");
  assert.notEqual(state.entries[0].rolledBackAt, null);
});

test("rollbackChange ruller tilbake alle entries i en gruppe via changeLogId", async () => {
  const entries = [
    makeEntry({ id: "e1", changeLogId: "log_42", field: "email", oldValue: "a", newValue: "b" }),
    makeEntry({ id: "e2", changeLogId: "log_42", field: "phone", oldValue: "1", newValue: "2" }),
    makeEntry({ id: "e3", changeLogId: "log_99", field: "name", oldValue: "X", newValue: "Y" }),
  ];
  const { client, state } = createStub(entries);

  const applied: string[] = [];
  const applier: RollbackApplier = async (e) => {
    applied.push(e.id);
    return true;
  };

  const result = await rollbackChange(client, { changeLogId: "log_42" }, applier);

  assert.equal(result.rolledBack, 2);
  assert.deepEqual(result.entryIds.sort(), ["e1", "e2"]);
  assert.deepEqual(applied.sort(), ["e1", "e2"]);

  // log_99 skal være urørt
  const e3 = state.entries.find((e) => e.id === "e3")!;
  assert.equal(e3.rolledBackAt, null);
});

test("rollbackChange hopper over allerede tilbakerullede entries", async () => {
  const alreadyRolled = makeEntry({
    id: "e1",
    changeLogId: "log_1",
    rolledBackAt: new Date("2026-04-28T09:00:00Z"),
  });
  const fresh = makeEntry({ id: "e2", changeLogId: "log_1", field: "phone" });
  const { client } = createStub([alreadyRolled, fresh]);

  const applied: string[] = [];
  const applier: RollbackApplier = async (e) => {
    applied.push(e.id);
    return true;
  };

  const result = await rollbackChange(client, { changeLogId: "log_1" }, applier);

  assert.equal(result.rolledBack, 1);
  assert.deepEqual(result.entryIds, ["e2"]);
  assert.deepEqual(applied, ["e2"]);
});

test("rollbackChange teller ikke entries der applier returnerer false", async () => {
  const entries = [
    makeEntry({ id: "e1", changeLogId: "log_1", model: "KnownModel" }),
    makeEntry({ id: "e2", changeLogId: "log_1", model: "UnknownModel" }),
  ];
  const { client, state } = createStub(entries);

  const applier: RollbackApplier = (e) => e.model === "KnownModel";

  const result = await rollbackChange(client, { changeLogId: "log_1" }, applier);

  assert.equal(result.rolledBack, 1);
  assert.deepEqual(result.entryIds, ["e1"]);

  // Bare e1 skal være markert som rullet tilbake
  const e1 = state.entries.find((e) => e.id === "e1")!;
  const e2 = state.entries.find((e) => e.id === "e2")!;
  assert.notEqual(e1.rolledBackAt, null);
  assert.equal(e2.rolledBackAt, null);
});

test("rollbackChange kaster når referansen ikke finner noen entries", async () => {
  const { client } = createStub([]);
  const applier: RollbackApplier = () => true;

  await assert.rejects(
    () => rollbackChange(client, { entryId: "missing" }, applier),
    /ingen.*entries/i
  );
});

test("rollbackChange validerer at minst én referanse er gitt", async () => {
  const { client } = createStub([]);
  const applier: RollbackApplier = () => true;

  await assert.rejects(
    // @ts-expect-error — tester runtime-validering
    () => rollbackChange(client, {}, applier),
    /referanse/i
  );
});

test("rollbackChange propagerer feil fra applier", async () => {
  const entry = makeEntry({ id: "e1" });
  const { client, state } = createStub([entry]);

  const applier: RollbackApplier = () => {
    throw new Error("databasefeil");
  };

  await assert.rejects(
    () => rollbackChange(client, { entryId: "e1" }, applier),
    /databasefeil/
  );

  // Entry skal ikke være markert som rullet tilbake hvis applier feilet
  assert.equal(state.entries[0].rolledBackAt, null);
});
