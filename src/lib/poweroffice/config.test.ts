import assert from "node:assert/strict";
import test from "node:test";

import { getPowerOfficeTenantPoIdWhere } from "./config";

test("getPowerOfficeTenantPoIdWhere builds Prisma compound unique input", () => {
  assert.deepEqual(getPowerOfficeTenantPoIdWhere(123), {
    tenantSlug_poId: {
      tenantSlug: "demo-nrt",
      poId: 123n,
    },
  });
});
