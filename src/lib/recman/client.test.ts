import assert from "node:assert/strict";
import test from "node:test";

import { assertRecmanGetSuccess } from "./client";
import { CANDIDATE_ALL_FIELDS } from "./types";

test("CANDIDATE_ALL_FIELDS omits fields Recman v2 rejects", () => {
  const fields = CANDIDATE_ALL_FIELDS.split(",");
  const rejectedByRecman = [
    "phone",
    "address",
    "postalPlace",
    "image",
    "linkedIn",
    "relative",
  ];

  for (const field of rejectedByRecman) {
    assert.equal(fields.includes(field), false, `${field} must not be requested`);
  }
});

test("assertRecmanGetSuccess throws Recman API errors instead of masking them as empty syncs", () => {
  assert.throws(
    () =>
      assertRecmanGetSuccess(
        {
          success: false,
          error: [
            { message: "Invalid field: phone" },
            { message: "Invalid field: address" },
          ],
        },
        "candidate page 1"
      ),
    /Recman API candidate page 1 failed: Invalid field: phone; Invalid field: address/
  );
});
