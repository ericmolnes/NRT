import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSyncReviewMutationResult,
  describeSyncReviewAction,
  groupSyncConflicts,
  type AssistantSyncConflict,
} from "./sync-review-panel";

const conflicts: AssistantSyncConflict[] = [
  {
    id: "conflict-1",
    source: "RECMAN",
    model: "RecmanCandidate",
    recordId: "candidate-1",
    field: "email",
    localValue: "local@example.com",
    remoteValue: "remote@example.com",
    detectedAt: new Date("2026-04-28T10:00:00Z"),
  },
  {
    id: "conflict-2",
    source: "RECMAN",
    model: "RecmanCandidate",
    recordId: "candidate-1",
    field: "phone",
    localValue: "111",
    remoteValue: "222",
    detectedAt: new Date("2026-04-28T11:00:00Z"),
  },
  {
    id: "conflict-3",
    source: "POWEROFFICE",
    model: "POEmployee",
    recordId: null,
    field: "department",
    localValue: "Rig",
    remoteValue: "Admin",
    detectedAt: new Date("2026-04-28T12:00:00Z"),
  },
];

test("groupSyncConflicts groups conflicts by source, model, and record id", () => {
  const groups = groupSyncConflicts(conflicts);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].source, "RECMAN");
  assert.equal(groups[0].model, "RecmanCandidate");
  assert.equal(groups[0].recordId, "candidate-1");
  assert.deepEqual(
    groups[0].conflicts.map((conflict) => conflict.id),
    ["conflict-1", "conflict-2"]
  );
  assert.equal(groups[1].recordId, null);
  assert.equal(groups[1].conflicts.length, 1);
});

test("describeSyncReviewAction makes the staged mutation explicit", () => {
  assert.equal(
    describeSyncReviewAction({
      kind: "resolve",
      conflictId: "conflict-1",
      resolution: "KEEP_REMOTE",
    }),
    "Behold remote-verdi for konflikt conflict-1"
  );

  assert.equal(
    describeSyncReviewAction({ kind: "ignore", conflictId: "conflict-3" }),
    "Ignorer konflikt conflict-3"
  );
});

test("assertSyncReviewMutationResult rejects missing or unsuccessful action results", () => {
  assert.throws(
    () => assertSyncReviewMutationResult(undefined, "Ignorer konflikt conflict-3"),
    /returnerte ikke en gyldig status/
  );

  assert.throws(
    () =>
      assertSyncReviewMutationResult(
        { ok: false },
        "Behold lokal verdi for konflikt conflict-1"
      ),
    /mislyktes/
  );

  assert.doesNotThrow(() =>
    assertSyncReviewMutationResult({ ok: true }, "Ignorer konflikt conflict-3")
  );
});
