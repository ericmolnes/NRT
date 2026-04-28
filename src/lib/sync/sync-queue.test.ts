import assert from "node:assert/strict";
import test from "node:test";

import {
  emptySyncResult,
  mergeSyncResults,
  processSyncDiagnosis,
} from "./sync-queue";
import type {
  SyncQueueClient,
  SyncConflictRow,
  CreateSyncConflictArgs,
  CreateSystemNotificationArgs,
  SystemNotificationRow,
} from "./sync-queue";
import type { SyncDiagnosis } from "./conflict-detector";

// ─── In-memory stub av SyncQueueClient ──────────────────────────────

type StubState = {
  conflicts: SyncConflictRow[];
  notifications: SystemNotificationRow[];
  conflictCalls: CreateSyncConflictArgs[];
  notificationCalls: CreateSystemNotificationArgs[];
  nextId: number;
};

function createStub(): { client: SyncQueueClient; state: StubState } {
  const state: StubState = {
    conflicts: [],
    notifications: [],
    conflictCalls: [],
    notificationCalls: [],
    nextId: 1,
  };

  const client: SyncQueueClient = {
    syncConflict: {
      async create(args) {
        state.conflictCalls.push(args);
        const row: SyncConflictRow = {
          id: `c_${state.nextId++}`,
          source: args.data.source,
          model: args.data.model,
          recordId: args.data.recordId ?? null,
          field: args.data.field,
          localValue: args.data.localValue ?? null,
          remoteValue: args.data.remoteValue ?? null,
          status: "UNRESOLVED",
          detectedAt: new Date("2026-04-28T10:00:00Z"),
        };
        state.conflicts.push(row);
        return row;
      },
    },
    systemNotification: {
      async create(args) {
        state.notificationCalls.push(args);
        const row: SystemNotificationRow = {
          id: `n_${state.nextId++}`,
          kind: args.data.kind,
          title: args.data.title,
          body: args.data.body ?? null,
          severity: args.data.severity ?? "INFO",
          targetLevel: args.data.targetLevel ?? null,
          targetUserId: args.data.targetUserId ?? null,
        };
        state.notifications.push(row);
        return { id: row.id };
      },
    },
  };

  return { client, state };
}

// ─── Tester ────────────────────────────────────────────────────────

test("processSyncDiagnosis: no_change gir tomt resultat", async () => {
  const { client, state } = createStub();
  const applied: string[] = [];

  const result = await processSyncDiagnosis(client, {
    source: "POWEROFFICE",
    model: "POEmployee",
    recordId: "r1",
    diagnosis: { kind: "no_change" },
    applyChange: async (field) => {
      applied.push(field);
    },
  });

  assert.equal(result.applied, 0);
  assert.equal(result.conflicts, 0);
  assert.equal(result.pendingPush, 0);
  assert.equal(result.missingLink, 0);
  assert.equal(result.unchanged, 1);
  assert.equal(applied.length, 0);
  assert.equal(state.conflicts.length, 0);
});

test("processSyncDiagnosis: remote_only kaller applyChange per felt", async () => {
  const { client, state } = createStub();
  const applied: Array<{ field: string; value: unknown }> = [];

  const diagnosis: SyncDiagnosis = {
    kind: "remote_only",
    changes: [
      { field: "email", localValue: "old@x", remoteValue: "ny@x", baseValue: "old@x" },
      { field: "phone", localValue: "111", remoteValue: "222", baseValue: "111" },
    ],
  };

  const result = await processSyncDiagnosis(client, {
    source: "POWEROFFICE",
    model: "POEmployee",
    recordId: "r1",
    diagnosis,
    applyChange: async (field, value) => {
      applied.push({ field, value });
    },
  });

  assert.equal(result.applied, 2);
  assert.equal(result.conflicts, 0);
  assert.equal(state.conflicts.length, 0);
  assert.deepEqual(applied, [
    { field: "email", value: "ny@x" },
    { field: "phone", value: "222" },
  ]);
});

test("processSyncDiagnosis: conflict oppretter SyncConflict-rader uten å applyChange", async () => {
  const { client, state } = createStub();
  const applied: string[] = [];

  const diagnosis: SyncDiagnosis = {
    kind: "conflict",
    conflicts: [
      { field: "email", localValue: "lokal@x", remoteValue: "remote@x", baseValue: "old@x" },
    ],
    safeRemote: [],
  };

  const result = await processSyncDiagnosis(client, {
    source: "RECMAN",
    model: "RecmanCandidate",
    recordId: "r2",
    diagnosis,
    applyChange: async (field) => {
      applied.push(field);
    },
  });

  assert.equal(result.conflicts, 1);
  assert.equal(result.applied, 0);
  assert.equal(applied.length, 0);
  assert.equal(state.conflicts.length, 1);
  assert.equal(state.conflicts[0].source, "RECMAN");
  assert.equal(state.conflicts[0].model, "RecmanCandidate");
  assert.equal(state.conflicts[0].recordId, "r2");
  assert.equal(state.conflicts[0].field, "email");
  assert.equal(state.conflicts[0].localValue, "lokal@x");
  assert.equal(state.conflicts[0].remoteValue, "remote@x");
});

test("processSyncDiagnosis: conflict applyer safeRemote-felt selv om andre felt er konflikt", async () => {
  const { client, state } = createStub();
  const applied: Array<{ field: string; value: unknown }> = [];

  const diagnosis: SyncDiagnosis = {
    kind: "conflict",
    conflicts: [
      { field: "email", localValue: "lokal@x", remoteValue: "remote@x", baseValue: "old@x" },
    ],
    safeRemote: [
      { field: "phone", localValue: "111", remoteValue: "222", baseValue: "111" },
    ],
  };

  const result = await processSyncDiagnosis(client, {
    source: "POWEROFFICE",
    model: "POEmployee",
    recordId: "r3",
    diagnosis,
    applyChange: async (field, value) => {
      applied.push({ field, value });
    },
  });

  assert.equal(result.applied, 1);
  assert.equal(result.conflicts, 1);
  assert.equal(state.conflicts.length, 1);
  assert.deepEqual(applied, [{ field: "phone", value: "222" }]);
});

test("processSyncDiagnosis: local_only flagger pendingPush uten å overskrive remote", async () => {
  const { client, state } = createStub();
  const applied: string[] = [];

  const diagnosis: SyncDiagnosis = {
    kind: "local_only",
    changes: [
      { field: "email", localValue: "ny@x", remoteValue: "old@x", baseValue: "old@x" },
    ],
  };

  const result = await processSyncDiagnosis(client, {
    source: "POWEROFFICE",
    model: "POEmployee",
    recordId: "r4",
    diagnosis,
    applyChange: async (field) => {
      applied.push(field);
    },
  });

  assert.equal(result.pendingPush, 1);
  assert.equal(result.applied, 0);
  assert.equal(result.conflicts, 0);
  assert.equal(applied.length, 0);
  assert.equal(state.conflicts.length, 0);
});

test("processSyncDiagnosis: missing_link rapporteres separat", async () => {
  const { client } = createStub();

  const result = await processSyncDiagnosis(client, {
    source: "RECMAN",
    model: "RecmanCandidate",
    recordId: "r5",
    diagnosis: { kind: "missing_link" },
    applyChange: async () => {
      throw new Error("Skal ikke kalles for missing_link");
    },
  });

  assert.equal(result.missingLink, 1);
  assert.equal(result.applied, 0);
  assert.equal(result.conflicts, 0);
});

test("mergeSyncResults: aggregerer flere resultater til ett", () => {
  const a = { applied: 2, conflicts: 1, pendingPush: 0, missingLink: 0, unchanged: 3 };
  const b = { applied: 1, conflicts: 2, pendingPush: 1, missingLink: 1, unchanged: 0 };
  const c = { applied: 0, conflicts: 0, pendingPush: 0, missingLink: 0, unchanged: 1 };

  const merged = mergeSyncResults([a, b, c]);

  assert.deepEqual(merged, {
    applied: 3,
    conflicts: 3,
    pendingPush: 1,
    missingLink: 1,
    unchanged: 4,
  });
});

test("mergeSyncResults: tom liste gir nullresultat", () => {
  assert.deepEqual(mergeSyncResults([]), emptySyncResult());
});

test("processSyncDiagnosis: applyChange-feil propageres så kalleren kan logge", async () => {
  const { client } = createStub();

  const diagnosis: SyncDiagnosis = {
    kind: "remote_only",
    changes: [
      { field: "email", localValue: "old@x", remoteValue: "ny@x", baseValue: "old@x" },
    ],
  };

  await assert.rejects(
    processSyncDiagnosis(client, {
      source: "POWEROFFICE",
      model: "POEmployee",
      recordId: "r6",
      diagnosis,
      applyChange: async () => {
        throw new Error("DB write failed");
      },
    }),
    /DB write failed/
  );
});

test("processSyncDiagnosis: conflict med flere felt oppretter én SyncConflict per felt", async () => {
  const { client, state } = createStub();

  const diagnosis: SyncDiagnosis = {
    kind: "conflict",
    conflicts: [
      { field: "email", localValue: "a", remoteValue: "b", baseValue: "c" },
      { field: "phone", localValue: "1", remoteValue: "2", baseValue: "3" },
      { field: "firstName", localValue: "X", remoteValue: "Y", baseValue: "Z" },
    ],
    safeRemote: [],
  };

  const result = await processSyncDiagnosis(client, {
    source: "RECMAN",
    model: "RecmanCandidate",
    recordId: "r7",
    diagnosis,
    applyChange: async () => {
      throw new Error("ikke kall");
    },
  });

  assert.equal(result.conflicts, 3);
  assert.equal(state.conflicts.length, 3);
  const fields = state.conflicts.map((c) => c.field).sort();
  assert.deepEqual(fields, ["email", "firstName", "phone"]);
});
