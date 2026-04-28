import assert from "node:assert/strict";
import test from "node:test";

import { diagnoseFields } from "./conflict-detector";

// ─── Hjelper ────────────────────────────────────────────────────────

const FIELDS = ["firstName", "lastName", "email", "phone"];

// ─── Tester ─────────────────────────────────────────────────────────

test("diagnoseFields gir no_change når alt er likt på tvers av lag", () => {
  const result = diagnoseFields({
    local: { firstName: "Eric", lastName: "Molnes", email: "e@x", phone: "1" },
    remote: { firstName: "Eric", lastName: "Molnes", email: "e@x", phone: "1" },
    base: { firstName: "Eric", lastName: "Molnes", email: "e@x", phone: "1" },
    fields: FIELDS,
  });

  assert.equal(result.kind, "no_change");
});

test("diagnoseFields gir remote_only når kun remote er endret siden base", () => {
  const result = diagnoseFields({
    local: { firstName: "Eric", lastName: "Molnes", email: "old@x", phone: "1" },
    remote: { firstName: "Eric", lastName: "Molnes", email: "new@x", phone: "1" },
    base: { firstName: "Eric", lastName: "Molnes", email: "old@x", phone: "1" },
    fields: FIELDS,
  });

  assert.equal(result.kind, "remote_only");
  if (result.kind !== "remote_only") return;
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].field, "email");
  assert.equal(result.changes[0].localValue, "old@x");
  assert.equal(result.changes[0].remoteValue, "new@x");
  assert.equal(result.changes[0].baseValue, "old@x");
});

test("diagnoseFields gir local_only når kun lokalt er endret siden base", () => {
  const result = diagnoseFields({
    local: { firstName: "Eric", lastName: "Molnes", email: "ny@x", phone: "1" },
    remote: { firstName: "Eric", lastName: "Molnes", email: "old@x", phone: "1" },
    base: { firstName: "Eric", lastName: "Molnes", email: "old@x", phone: "1" },
    fields: FIELDS,
  });

  assert.equal(result.kind, "local_only");
  if (result.kind !== "local_only") return;
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].field, "email");
});

test("diagnoseFields gir conflict når begge sider har endret samme felt til ulike verdier", () => {
  const result = diagnoseFields({
    local: { firstName: "Eric", lastName: "Molnes", email: "lokal@x", phone: "1" },
    remote: { firstName: "Eric", lastName: "Molnes", email: "remote@x", phone: "1" },
    base: { firstName: "Eric", lastName: "Molnes", email: "old@x", phone: "1" },
    fields: FIELDS,
  });

  assert.equal(result.kind, "conflict");
  if (result.kind !== "conflict") return;
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].field, "email");
  assert.equal(result.conflicts[0].localValue, "lokal@x");
  assert.equal(result.conflicts[0].remoteValue, "remote@x");
  assert.equal(result.conflicts[0].baseValue, "old@x");
  assert.equal(result.safeRemote.length, 0);
});

test("diagnoseFields skiller safeRemote fra conflict når begge typer endring forekommer samtidig", () => {
  const result = diagnoseFields({
    local: { firstName: "Eric", lastName: "Molnes", email: "lokal@x", phone: "1" },
    remote: { firstName: "Eric", lastName: "Molnesen", email: "remote@x", phone: "1" },
    base: { firstName: "Eric", lastName: "Molnes", email: "old@x", phone: "1" },
    fields: FIELDS,
  });

  // email er konflikt (begge endret), lastName er trygg remote-only
  assert.equal(result.kind, "conflict");
  if (result.kind !== "conflict") return;
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].field, "email");
  assert.equal(result.safeRemote.length, 1);
  assert.equal(result.safeRemote[0].field, "lastName");
  assert.equal(result.safeRemote[0].remoteValue, "Molnesen");
});

test("diagnoseFields gir no_change når begge sider har konvergert til samme nye verdi", () => {
  // Hvis begge sider endret email til samme nye verdi har de allerede
  // konvergert — ikke noe å løse.
  const result = diagnoseFields({
    local: { email: "ny@x" },
    remote: { email: "ny@x" },
    base: { email: "old@x" },
    fields: ["email"],
  });

  assert.equal(result.kind, "no_change");
});

test("diagnoseFields gir missing_link når det ikke finnes lokal rad ennå", () => {
  const result = diagnoseFields({
    local: null,
    remote: { firstName: "Ola", lastName: "Nordmann", email: "o@n", phone: "1" },
    base: null,
    fields: FIELDS,
  });

  assert.equal(result.kind, "missing_link");
});

test("diagnoseFields tar remote_only når remote er null (slettet) men lokalt finnes", () => {
  // Vi behandler remote=null som "ingen oppdatering tilgjengelig", ikke som
  // konflikt. Sletting i remote må håndteres eksplisitt av kalleren.
  const result = diagnoseFields({
    local: { email: "old@x" },
    remote: null,
    base: { email: "old@x" },
    fields: ["email"],
  });

  assert.equal(result.kind, "no_change");
});

test("diagnoseFields kun sammenligner felter i fields-listen", () => {
  const result = diagnoseFields({
    local: { firstName: "Eric", phone: "lokal" },
    remote: { firstName: "Eric", phone: "remote" },
    base: { firstName: "Eric", phone: "base" },
    fields: ["firstName"], // phone er ekskludert
  });

  assert.equal(result.kind, "no_change");
});

test("diagnoseFields uten base behandler eksisterende lokal og remote som likeverdige", () => {
  // Hvis vi ikke har en base (første sync etter migrering, eller manglende
  // rawJson), kan vi ikke skille local_only fra remote_only. Vi skal da
  // markere felt-forskjeller som konflikt for å forhindre silent overwrite.
  const result = diagnoseFields({
    local: { email: "lokal@x" },
    remote: { email: "remote@x" },
    base: null,
    fields: ["email"],
  });

  assert.equal(result.kind, "conflict");
  if (result.kind !== "conflict") return;
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].field, "email");
});

test("diagnoseFields uten base og likt local/remote gir no_change", () => {
  const result = diagnoseFields({
    local: { email: "samme@x" },
    remote: { email: "samme@x" },
    base: null,
    fields: ["email"],
  });

  assert.equal(result.kind, "no_change");
});

test("diagnoseFields normaliserer null/undefined så manglende verdi ikke gir falsk konflikt", () => {
  const result = diagnoseFields({
    local: { phone: null },
    remote: { phone: undefined },
    base: { phone: null },
    fields: ["phone"],
  });

  assert.equal(result.kind, "no_change");
});

test("diagnoseFields aggregerer alle feltdiffer samme retning til ett remote_only-resultat", () => {
  const result = diagnoseFields({
    local: { firstName: "Eric", lastName: "Molnes", email: "old@x" },
    remote: { firstName: "Erik", lastName: "Molnesen", email: "ny@x" },
    base: { firstName: "Eric", lastName: "Molnes", email: "old@x" },
    fields: ["firstName", "lastName", "email"],
  });

  assert.equal(result.kind, "remote_only");
  if (result.kind !== "remote_only") return;
  assert.equal(result.changes.length, 3);
  const fieldNames = result.changes.map((c) => c.field).sort();
  assert.deepEqual(fieldNames, ["email", "firstName", "lastName"]);
});
