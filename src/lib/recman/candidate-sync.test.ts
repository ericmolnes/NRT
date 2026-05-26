import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRecmanCandidateSyncPlan,
  deriveRecmanCandidateEmployeeState,
  parseRecmanDate,
  serializeRecmanCandidateBase,
  shouldEnsurePersonnelForRecmanCandidate,
  type RecmanCandidateSyncShape,
} from "./candidate-sync";

test("buildRecmanCandidateSyncPlan keeps conflicted fields out of safe updates", () => {
  const base: RecmanCandidateSyncShape = {
    firstName: "Base",
    lastName: "Old",
    title: "Elektriker",
  };
  const local: RecmanCandidateSyncShape = {
    firstName: "Local Edit",
    lastName: "Old",
    title: "Elektriker",
  };
  const remote: RecmanCandidateSyncShape = {
    firstName: "Remote Edit",
    lastName: "Remote Last",
    title: "Elektriker",
  };

  const plan = buildRecmanCandidateSyncPlan({
    local,
    remote,
    baseRawJson: serializeRecmanCandidateBase(base),
  });

  assert.equal(plan.diagnosis.kind, "conflict");
  assert.deepEqual(plan.safeFieldUpdates, { lastName: "Remote Last" });

  const nextBase = JSON.parse(plan.nextBaseRawJson!);
  assert.equal(nextBase.firstName, "Base");
  assert.equal(nextBase.lastName, "Remote Last");
});

test("buildRecmanCandidateSyncPlan applies remote-only fields and advances base", () => {
  const base: RecmanCandidateSyncShape = {
    firstName: "Eric",
    lastName: "Old",
  };
  const local: RecmanCandidateSyncShape = {
    firstName: "Eric",
    lastName: "Old",
  };
  const remote: RecmanCandidateSyncShape = {
    firstName: "Eric",
    lastName: "New",
  };

  const plan = buildRecmanCandidateSyncPlan({
    local,
    remote,
    baseRawJson: serializeRecmanCandidateBase(base),
  });

  assert.equal(plan.diagnosis.kind, "remote_only");
  assert.deepEqual(plan.safeFieldUpdates, { lastName: "New" });

  const nextBase = JSON.parse(plan.nextBaseRawJson!);
  assert.equal(nextBase.lastName, "New");
});

test("buildRecmanCandidateSyncPlan does not invent a base for legacy conflicts", () => {
  const local: RecmanCandidateSyncShape = { firstName: "Local" };
  const remote: RecmanCandidateSyncShape = { firstName: "Remote" };

  const plan = buildRecmanCandidateSyncPlan({
    local,
    remote,
    baseRawJson: null,
  });

  assert.equal(plan.diagnosis.kind, "conflict");
  assert.equal(plan.nextBaseRawJson, null);
});

test("buildRecmanCandidateSyncPlan applies RecMan employee fields even when base is missing", () => {
  const local: RecmanCandidateSyncShape = {
    firstName: "Local",
    isEmployee: true,
    employeeNumber: 42,
    employeeStart: new Date("2024-01-01T00:00:00Z"),
    employeeEnd: null,
  };
  const remote: RecmanCandidateSyncShape = {
    firstName: "Remote",
    isEmployee: false,
    employeeNumber: null,
    employeeStart: null,
    employeeEnd: null,
  };

  const plan = buildRecmanCandidateSyncPlan({
    local,
    remote,
    baseRawJson: null,
  });

  assert.equal(plan.diagnosis.kind, "conflict");
  assert.deepEqual(plan.safeFieldUpdates, {
    isEmployee: false,
    employeeNumber: null,
    employeeStart: null,
  });
  assert.equal(plan.nextBaseRawJson, null);
});

test("deriveRecmanCandidateEmployeeState derives personnel status from local synced row", () => {
  assert.deepEqual(
    deriveRecmanCandidateEmployeeState({
      isEmployee: true,
      employeeEnd: null,
    }),
    { hasEmployee: true, targetStatus: "ACTIVE" }
  );

  assert.deepEqual(
    deriveRecmanCandidateEmployeeState({
      isEmployee: true,
      employeeEnd: new Date("2026-01-01T00:00:00Z"),
    }),
    { hasEmployee: true, targetStatus: "INACTIVE" }
  );

  assert.deepEqual(
    deriveRecmanCandidateEmployeeState({
      isEmployee: false,
      employeeEnd: null,
    }),
    { hasEmployee: false, targetStatus: null }
  );

  assert.deepEqual(
    deriveRecmanCandidateEmployeeState(
      {
        isEmployee: false,
        employeeEnd: null,
      },
      { wasEmployee: true }
    ),
    { hasEmployee: false, targetStatus: "INACTIVE" }
  );
});

test("shouldEnsurePersonnelForRecmanCandidate only auto-creates Personnel for employees", () => {
  assert.equal(
    shouldEnsurePersonnelForRecmanCandidate({
      hasEmployee: true,
      targetStatus: "ACTIVE",
    }),
    true
  );

  assert.equal(
    shouldEnsurePersonnelForRecmanCandidate({
      hasEmployee: false,
      targetStatus: null,
    }),
    false
  );

  assert.equal(
    shouldEnsurePersonnelForRecmanCandidate({
      hasEmployee: false,
      targetStatus: "INACTIVE",
    }),
    false
  );
});

test("parseRecmanDate returns null for blank and invalid Recman dates", () => {
  assert.equal(parseRecmanDate(undefined), null);
  assert.equal(parseRecmanDate(""), null);
  assert.equal(parseRecmanDate("0000-00-00"), null);
  assert.equal(parseRecmanDate("not-a-date"), null);

  assert.equal(
    parseRecmanDate("2026-05-26")?.toISOString(),
    "2026-05-26T00:00:00.000Z"
  );
});
