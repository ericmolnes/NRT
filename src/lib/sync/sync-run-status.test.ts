import assert from "node:assert/strict";
import test from "node:test";

import {
  countFailedRecords,
  getSyncLogStatus,
  hasSyncRunFailures,
  summarizeSyncRunMessage,
} from "./sync-run-status";
import { emptySyncResult } from "./sync-queue";

test("getSyncLogStatus marks per-record failures as partial", () => {
  assert.equal(getSyncLogStatus(0), "completed");
  assert.equal(getSyncLogStatus(2), "partial");
});

test("hasSyncRunFailures detects nested resource errors and failed records", () => {
  assert.equal(
    hasSyncRunFailures({
      customers: { total: 2, synced: 2, failed: 0 },
      employees: { total: 3, synced: 2, failed: 1 },
      errors: [],
    }),
    true
  );

  assert.equal(
    hasSyncRunFailures({
      candidates: { error: "RecMan API rejected request" },
      conflicts: emptySyncResult(),
      errors: [{ resource: "candidates", message: "RecMan API rejected request" }],
    }),
    true
  );
});

test("countFailedRecords ignores unrelated numeric fields", () => {
  assert.equal(
    countFailedRecords({
      total: 20,
      synced: 18,
      failed: 2,
      nested: { failed: 3, recordsFailed: 4 },
    }),
    9
  );
});

test("hasSyncRunFailures treats missing remote records as sync drift", () => {
  assert.equal(
    hasSyncRunFailures({
      candidates: { total: 10, synced: 10, failed: 0, missingRemote: 1 },
    }),
    true
  );
});

test("hasSyncRunFailures treats unresolved conflicts and missing links as attention needed", () => {
  assert.equal(
    hasSyncRunFailures({
      employees: {
        conflicts: { ...emptySyncResult(), conflicts: 1 },
      },
    }),
    true
  );

  assert.equal(
    hasSyncRunFailures({
      candidates: {
        conflicts: { ...emptySyncResult(), missingLink: 2 },
      },
    }),
    true
  );
});

test("summarizeSyncRunMessage includes sync failures next to conflicts", () => {
  const message = summarizeSyncRunMessage({
    conflicts: { ...emptySyncResult(), conflicts: 2 },
    failedRecords: 3,
    errorCount: 1,
    missingRemoteRecords: 4,
  });

  assert.match(message, /2 konflikter/);
  assert.match(message, /3 radfeil/);
  assert.match(message, /1 delsync feilet/);
  assert.match(message, /4 mangler hos kilde/);
});
