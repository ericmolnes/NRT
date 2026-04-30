import assert from "node:assert/strict";
import test from "node:test";

import { buildCategoryWhere } from "@/lib/personell/category";
import { buildEvaluationRoleWhere } from "./evaluation-personnel-filters";

const NOW = new Date("2026-04-29T12:00:00Z");

test("buildEvaluationRoleWhere maps Ansatt to shared category rules", () => {
  assert.deepEqual(
    buildEvaluationRoleWhere("Ansatt", NOW),
    buildCategoryWhere("ANSATT", NOW)
  );
});

test("buildEvaluationRoleWhere maps Innleid to shared category rules", () => {
  assert.deepEqual(
    buildEvaluationRoleWhere("Innleid", NOW),
    buildCategoryWhere("INNLEID", NOW)
  );
});

test("buildEvaluationRoleWhere keeps unknown role filters as direct role matches", () => {
  assert.deepEqual(buildEvaluationRoleWhere("Prosjektleder", NOW), {
    role: "Prosjektleder",
  });
});

test("buildEvaluationRoleWhere returns empty where for no role filter", () => {
  assert.deepEqual(buildEvaluationRoleWhere(null, NOW), {});
  assert.deepEqual(buildEvaluationRoleWhere(undefined, NOW), {});
});
