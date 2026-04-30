import assert from "node:assert/strict";
import test from "node:test";

import { buildRecmanJobAllocationData } from "./sync-jobs";

test("buildRecmanJobAllocationData links generated allocation to assignment", () => {
  const startDate = new Date("2026-04-01");
  const endDate = new Date("2026-04-14");

  assert.deepEqual(
    buildRecmanJobAllocationData({
      entryId: "entry_1",
      jobAssignmentId: "assignment_1",
      startDate,
      endDate,
      label: "Kunde - Offshore arbeid",
    }),
    {
      entryId: "entry_1",
      jobAssignmentId: "assignment_1",
      startDate,
      endDate,
      label: "Kunde - Offshore arbeid",
      source: "JOB_GENERATED",
    }
  );
});

test("buildRecmanJobAllocationData skips open-ended Recman jobs", () => {
  assert.equal(
    buildRecmanJobAllocationData({
      entryId: "entry_1",
      jobAssignmentId: "assignment_1",
      startDate: new Date("2026-04-01"),
      endDate: null,
      label: "Kunde - Offshore arbeid",
    }),
    null
  );
});
