import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("AssistantPanel catches prompt action failures and shows the message", () => {
  const source = readFileSync(
    new URL("./assistant-panel.tsx", import.meta.url),
    "utf8"
  );
  const start = source.indexOf("function handleRunPromptAction");
  assert.notEqual(start, -1, "handleRunPromptAction must exist");

  const body = source.slice(start, source.indexOf("return (", start));
  assert.match(body, /try\s*{/, "prompt action must run inside try/catch");
  assert.match(body, /catch\s*\(/, "prompt action must catch server errors");
  assert.match(
    body,
    /setResultMessage/,
    "prompt action errors must be shown in the panel"
  );
});
