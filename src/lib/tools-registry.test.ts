import assert from "node:assert/strict";
import test from "node:test";

import {
  getToolForPathname,
  isToolActiveForPathname,
  tools,
} from "./tools-registry";

function tool(id: string) {
  const match = tools.find((item) => item.id === id);
  assert.ok(match, `Expected tool ${id} to exist`);
  return match;
}

test("getToolForPathname returns the most specific matching tool", () => {
  assert.equal(getToolForPathname("/personell/kandidater")?.id, "candidates");
  assert.equal(
    getToolForPathname("/personell/kandidater/abc123")?.id,
    "candidates"
  );
  assert.equal(
    getToolForPathname("/estimering/katalog")?.id,
    "product-catalog"
  );
  assert.equal(
    getToolForPathname("/poweroffice/kunder/abc123")?.id,
    "poweroffice-customers"
  );
});

test("getToolForPathname falls back to the parent tool for detail pages", () => {
  assert.equal(getToolForPathname("/personell/abc123")?.id, "personnel-list");
  assert.equal(getToolForPathname("/poweroffice")?.id, "poweroffice-dashboard");
});

test("isToolActiveForPathname only marks the best matching tool as active", () => {
  assert.equal(
    isToolActiveForPathname(tool("personnel-list"), "/personell/kandidater"),
    false
  );
  assert.equal(
    isToolActiveForPathname(tool("candidates"), "/personell/kandidater"),
    true
  );
  assert.equal(
    isToolActiveForPathname(tool("estimates"), "/estimering/katalog"),
    false
  );
  assert.equal(
    isToolActiveForPathname(tool("product-catalog"), "/estimering/katalog"),
    true
  );
});
