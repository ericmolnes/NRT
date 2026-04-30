import assert from "node:assert/strict";
import test from "node:test";

import { isPublicAuthPath } from "./auth.config";

test("isPublicAuthPath allows the public form password verifier", () => {
  assert.equal(isPublicAuthPath("/api/form-auth/verify-password"), true);
});

test("isPublicAuthPath keeps contractor imports protected", () => {
  assert.equal(isPublicAuthPath("/api/form-auth/import-contractors"), false);
});

test("isPublicAuthPath preserves login and public form pages", () => {
  assert.equal(isPublicAuthPath("/login"), true);
  assert.equal(isPublicAuthPath("/s/eval-token"), true);
});
