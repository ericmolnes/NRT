import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { listUnresolvedSyncConflicts } from "./list-conflicts";

type FindManyArgs = {
  where: {
    status: "UNRESOLVED";
    source?: "RECMAN" | "POWEROFFICE";
    model?: string;
  };
  orderBy: { detectedAt: "desc" };
};

function createClient() {
  const calls: FindManyArgs[] = [];
  const rows = [
    {
      id: "conflict_1",
      source: "RECMAN",
      model: "RecmanCandidate",
      recordId: "candidate_1",
      field: "email",
      localValue: "local@example.com",
      remoteValue: "remote@example.com",
      detectedAt: new Date("2026-04-29T08:00:00Z"),
      status: "UNRESOLVED",
      resolution: null,
      resolvedAt: null,
      resolvedById: null,
      resolvedByName: null,
      notes: null,
      changeLogId: null,
    },
  ];

  return {
    calls,
    client: {
      syncConflict: {
        async findMany(args: FindManyArgs) {
          calls.push(args);
          return rows;
        },
      },
    },
  };
}

test("listUnresolvedSyncConflicts: always filters unresolved conflicts newest first", async () => {
  const { client, calls } = createClient();

  const result = await listUnresolvedSyncConflicts(client, {});

  assert.equal(result.length, 1);
  assert.deepEqual(calls[0], {
    where: { status: "UNRESOLVED" },
    orderBy: { detectedAt: "desc" },
  });
});

test("listUnresolvedSyncConflicts: filters unresolved conflicts by source and model", async () => {
  const { client, calls } = createClient();

  await listUnresolvedSyncConflicts(client, {
    source: "POWEROFFICE",
    model: "POEmployee",
  });

  assert.deepEqual(calls[0], {
    where: {
      status: "UNRESOLVED",
      source: "POWEROFFICE",
      model: "POEmployee",
    },
    orderBy: { detectedAt: "desc" },
  });
});

test("sync conflict actions require admin before resolving or ignoring", () => {
  const source = readFileSync(
    new URL("../../app/(authenticated)/settings/sync-conflicts/actions.ts", import.meta.url),
    "utf8"
  );

  for (const functionName of ["resolveSyncConflict", "ignoreSyncConflict"]) {
    const start = source.indexOf(`export async function ${functionName}`);
    assert.notEqual(start, -1, `${functionName} must be exported`);

    const nextExport = source.indexOf("export async function", start + 1);
    const body = source.slice(start, nextExport === -1 ? source.length : nextExport);
    const authCheck = body.indexOf("if (!session?.user?.id)");
    const adminCheck = body.indexOf("await assertAdmin()");
    const transaction = body.indexOf("db.$transaction");

    assert.notEqual(authCheck, -1, `${functionName} must require a session`);
    assert.notEqual(adminCheck, -1, `${functionName} must call assertAdmin()`);
    assert.notEqual(transaction, -1, `${functionName} must use a transaction`);
    assert.ok(authCheck < adminCheck, `${functionName} must check session before admin`);
    assert.ok(adminCheck < transaction, `${functionName} must gate DB writes before transaction`);
  }
});

test("resolveSyncConflict validates runtime resolution before opening a transaction", () => {
  const source = readFileSync(
    new URL("../../app/(authenticated)/settings/sync-conflicts/actions.ts", import.meta.url),
    "utf8"
  );
  const start = source.indexOf("export async function resolveSyncConflict");
  const end = source.indexOf("export async function ignoreSyncConflict", start);
  const body = source.slice(start, end);

  const validation = body.indexOf("assertSyncResolution(resolution)");
  const transaction = body.indexOf("db.$transaction");

  assert.notEqual(validation, -1, "resolveSyncConflict must validate resolution at runtime");
  assert.notEqual(transaction, -1, "resolveSyncConflict must use a transaction");
  assert.ok(validation < transaction, "runtime resolution validation must run before transaction");
});

test("resolveSyncConflict applies KEEP_REMOTE to known synced models only", () => {
  const source = readFileSync(
    new URL("../../app/(authenticated)/settings/sync-conflicts/actions.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /tx\.pOEmployee\.update/, "KEEP_REMOTE must update POEmployee");
  assert.match(
    source,
    /tx\.recmanCandidate\.update/,
    "KEEP_REMOTE must update RecmanCandidate"
  );
  assert.match(
    source,
    /PO_EMPLOYEE_REMOTE_FIELDS/,
    "KEEP_REMOTE must allow-list POEmployee fields"
  );
  assert.match(
    source,
    /RECMAN_CANDIDATE_REMOTE_FIELDS/,
    "KEEP_REMOTE must allow-list RecmanCandidate fields"
  );
  assert.match(
    source,
    /coerceRecmanRemoteValue/,
    "Recman KEEP_REMOTE must coerce date-like JSON values"
  );
});

test("handled sync conflict actions acknowledge the remote base snapshot", () => {
  const source = readFileSync(
    new URL("../../app/(authenticated)/settings/sync-conflicts/actions.ts", import.meta.url),
    "utf8"
  );

  for (const functionName of ["resolveSyncConflict", "ignoreSyncConflict"]) {
    const start = source.indexOf(`export async function ${functionName}`);
    assert.notEqual(start, -1, `${functionName} must be exported`);

    const nextExport = source.indexOf("export async function", start + 1);
    const body = source.slice(start, nextExport === -1 ? source.length : nextExport);

    assert.match(
      body,
      /acknowledgeConflictRemoteBase\(tx, conflict\)/,
      `${functionName} must advance the rawJson base for handled conflicts`
    );
  }
});

test("ignoreSyncConflict selects remote value before acknowledging base", () => {
  const source = readFileSync(
    new URL("../../app/(authenticated)/settings/sync-conflicts/actions.ts", import.meta.url),
    "utf8"
  );
  const start = source.indexOf("export async function ignoreSyncConflict");
  assert.notEqual(start, -1, "ignoreSyncConflict must be exported");

  const body = source.slice(start);
  const remoteValueSelect = body.indexOf("remoteValue: true");
  const acknowledgeBase = body.indexOf("acknowledgeConflictRemoteBase(tx, conflict)");

  assert.notEqual(
    remoteValueSelect,
    -1,
    "ignoreSyncConflict must select remoteValue for base acknowledgement"
  );
  assert.ok(
    remoteValueSelect < acknowledgeBase,
    "ignoreSyncConflict must load remoteValue before acknowledging base"
  );
});
