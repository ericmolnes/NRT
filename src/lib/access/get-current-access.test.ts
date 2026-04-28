import assert from "node:assert/strict";
import test from "node:test";

import { resolveAccessLevel } from "./get-current-access";

// ─── Tester for ren resolveAccessLevel-funksjon ───────────────────
//
// Vi tester den rene funksjonen som tar inn data eksplisitt. DB-wrapperen
// `getCurrentAccess` testes ikke her — den koples mot ekte session/Prisma.

test("resolveAccessLevel returnerer MINIMUM når ingen rad, e-post eller gruppe matcher", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: "ny@example.com",
    groups: [],
    bootstrapEmails: [],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.userAccessId, null);
  assert.equal(result.source, "FALLBACK");
});

test("resolveAccessLevel returnerer MINIMUM når raden har level=MINIMUM", () => {
  const result = resolveAccessLevel({
    userAccessRow: { id: "ua_1", level: "MINIMUM" },
    email: "x@example.com",
    groups: [],
    bootstrapEmails: [],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.userAccessId, "ua_1");
  assert.equal(result.source, "DATABASE");
});

test("resolveAccessLevel returnerer USER når raden har level=USER", () => {
  const result = resolveAccessLevel({
    userAccessRow: { id: "ua_2", level: "USER" },
    email: "user@example.com",
    groups: [],
    bootstrapEmails: [],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "USER");
  assert.equal(result.userAccessId, "ua_2");
  assert.equal(result.source, "DATABASE");
});

test("resolveAccessLevel returnerer ADMIN når raden har level=ADMIN", () => {
  const result = resolveAccessLevel({
    userAccessRow: { id: "ua_3", level: "ADMIN" },
    email: "admin@example.com",
    groups: [],
    bootstrapEmails: [],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "ADMIN");
  assert.equal(result.userAccessId, "ua_3");
  assert.equal(result.source, "DATABASE");
});

test("resolveAccessLevel returnerer ADMIN via bootstrap-e-post (case-insensitive) uten rad", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: "Eric@NordicRigTech.com",
    groups: [],
    bootstrapEmails: ["eric@nordicrigtech.com"],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "ADMIN");
  assert.equal(result.userAccessId, null);
  assert.equal(result.source, "BOOTSTRAP_EMAIL");
});

test("resolveAccessLevel returnerer ADMIN via bootstrap-gruppe uten rad", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: "noen@example.com",
    groups: ["group-xyz", "admin-grp"],
    bootstrapEmails: [],
    bootstrapGroupId: "admin-grp",
  });

  assert.equal(result.level, "ADMIN");
  assert.equal(result.userAccessId, null);
  assert.equal(result.source, "BOOTSTRAP_GROUP");
});

test("resolveAccessLevel returnerer MINIMUM når ingen rad og hverken e-post eller gruppe matcher", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: "nobody@example.com",
    groups: ["random-group"],
    bootstrapEmails: ["other@example.com"],
    bootstrapGroupId: "admin-grp",
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.userAccessId, null);
  assert.equal(result.source, "FALLBACK");
});

test("DATABASE-rad har forrang over bootstrap-e-post", () => {
  // Selv om e-posten er i bootstrap-listen skal raden være autoritativ.
  // Når en bruker er nedgradert i databasen skal vi respektere det,
  // ellers ville en bruker aldri kunnet fjernes som admin.
  const result = resolveAccessLevel({
    userAccessRow: { id: "ua_locked", level: "MINIMUM" },
    email: "eric@nordicrigtech.com",
    groups: [],
    bootstrapEmails: ["eric@nordicrigtech.com"],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.userAccessId, "ua_locked");
  assert.equal(result.source, "DATABASE");
});

test("DATABASE-rad har forrang over bootstrap-gruppe", () => {
  const result = resolveAccessLevel({
    userAccessRow: { id: "ua_locked2", level: "USER" },
    email: "u@example.com",
    groups: ["admin-grp"],
    bootstrapEmails: [],
    bootstrapGroupId: "admin-grp",
  });

  assert.equal(result.level, "USER");
  assert.equal(result.userAccessId, "ua_locked2");
  assert.equal(result.source, "DATABASE");
});

test("resolveAccessLevel håndterer null e-post (ingen e-post i sesjonen)", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: null,
    groups: [],
    bootstrapEmails: ["eric@nordicrigtech.com"],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.userAccessId, null);
  assert.equal(result.source, "FALLBACK");
});

test("resolveAccessLevel ignorerer tom bootstrapGroupId", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: "x@example.com",
    groups: [""],
    bootstrapEmails: [],
    bootstrapGroupId: "",
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.source, "FALLBACK");
});
