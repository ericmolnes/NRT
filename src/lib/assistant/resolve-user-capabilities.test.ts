import assert from "node:assert/strict";
import test from "node:test";

import { resolveUserCapabilities } from "./resolve-user-capabilities";

test("MINIMUM cannot use assistant actions", () => {
  const capabilities = resolveUserCapabilities("MINIMUM");

  assert.equal(capabilities.canUseAssistant, false);
  assert.deepEqual(capabilities.allowedActionIds, []);
});

test("USER can plan and ask, but cannot run admin actions", () => {
  const capabilities = resolveUserCapabilities("USER");

  assert.equal(capabilities.canUseAssistant, true);
  assert.deepEqual(capabilities.allowedActionIds, [
    "assistant.plan",
    "assistant.ask",
  ]);
  assert.equal(
    capabilities.allowedActionIds.includes("settings.aiModel.update"),
    false
  );
});

test("ADMIN receives user actions plus admin-only actions", () => {
  const capabilities = resolveUserCapabilities("ADMIN");

  assert.equal(capabilities.canUseAssistant, true);
  assert.deepEqual(capabilities.allowedActionIds, [
    "assistant.plan",
    "assistant.ask",
    "settings.aiModel.update",
    "syncConflict.resolve",
    "syncConflict.ignore",
  ]);
});
