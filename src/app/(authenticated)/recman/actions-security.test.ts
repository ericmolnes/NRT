import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");

test("triggerRecmanSync checks admin access before starting sync", () => {
  const start = source.indexOf("export async function triggerRecmanSync");
  const end = source.indexOf("function summarizeResult", start);
  assert.notEqual(start, -1, "triggerRecmanSync was not found");
  assert.notEqual(end, -1, "summarizeResult marker was not found");

  const body = source.slice(start, end);
  const adminCheck = body.indexOf("await assertAdmin()");
  const syncCall = body.indexOf("syncAllRecman(");

  assert.notEqual(adminCheck, -1, "triggerRecmanSync must call assertAdmin()");
  assert.notEqual(syncCall, -1, "triggerRecmanSync must call syncAllRecman()");
  assert.ok(adminCheck < syncCall, "assertAdmin() must run before syncAllRecman()");
});
