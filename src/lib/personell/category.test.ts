import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveCategory,
  type CategoryInput,
  type PersonnelCategory,
} from "./category";

// ─── Hjelpere ────────────────────────────────────────────────────

const NOW = new Date("2026-04-28T12:00:00Z");
const FUTURE = new Date("2027-01-01T00:00:00Z");
const PAST = new Date("2024-01-01T00:00:00Z");

function input(overrides: Partial<CategoryInput> = {}): CategoryInput {
  return {
    recmanCandidate: null,
    hasOpenContractorPeriod: false,
    isManualPersonnel: false,
    now: NOW,
    ...overrides,
  };
}

// ─── ANSATT ──────────────────────────────────────────────────────

test("ANSATT: aktiv ansatt uten employeeEnd", () => {
  const result: PersonnelCategory = resolveCategory(
    input({
      recmanCandidate: { isEmployee: true, employeeEnd: null, isContractor: false },
    })
  );
  assert.equal(result, "ANSATT");
});

test("ANSATT: ansatt med employeeEnd i fremtiden", () => {
  const result = resolveCategory(
    input({
      recmanCandidate: { isEmployee: true, employeeEnd: FUTURE, isContractor: false },
    })
  );
  assert.equal(result, "ANSATT");
});

test("ANSATT trumfer INNLEID-flagg når isEmployee og aktiv", () => {
  // Tidligere ansatt markert som innleid mens fortsatt aktiv ansatt — ANSATT vinner.
  const result = resolveCategory(
    input({
      recmanCandidate: { isEmployee: true, employeeEnd: null, isContractor: true },
      hasOpenContractorPeriod: true,
    })
  );
  assert.equal(result, "ANSATT");
});

// ─── KANDIDAT ────────────────────────────────────────────────────

test("KANDIDAT: kun RecmanCandidate, ikke ansatt eller innleid", () => {
  const result = resolveCategory(
    input({
      recmanCandidate: { isEmployee: false, employeeEnd: null, isContractor: false },
    })
  );
  assert.equal(result, "KANDIDAT");
});

test("KANDIDAT: tidligere ansatt (employeeEnd i fortid) som ikke er innleid", () => {
  const result = resolveCategory(
    input({
      recmanCandidate: { isEmployee: true, employeeEnd: PAST, isContractor: false },
    })
  );
  // Ansettelsen er avsluttet, og personen er ikke innleid → KANDIDAT.
  assert.equal(result, "KANDIDAT");
});

// ─── INNLEID ─────────────────────────────────────────────────────

test("INNLEID: isContractor=true på RecmanCandidate", () => {
  const result = resolveCategory(
    input({
      recmanCandidate: { isEmployee: false, employeeEnd: null, isContractor: true },
    })
  );
  assert.equal(result, "INNLEID");
});

test("INNLEID: åpen ContractorPeriod selv om isContractor=false", () => {
  const result = resolveCategory(
    input({
      recmanCandidate: { isEmployee: false, employeeEnd: null, isContractor: false },
      hasOpenContractorPeriod: true,
    })
  );
  assert.equal(result, "INNLEID");
});

test("INNLEID: manuelt opprettet Personnel uten RecmanCandidate", () => {
  const result = resolveCategory(
    input({
      recmanCandidate: null,
      isManualPersonnel: true,
    })
  );
  assert.equal(result, "INNLEID");
});

test("INNLEID: tidligere ansatt med åpen periode", () => {
  // Avsluttet ansettelse, men leid inn igjen via periode.
  const result = resolveCategory(
    input({
      recmanCandidate: { isEmployee: true, employeeEnd: PAST, isContractor: false },
      hasOpenContractorPeriod: true,
    })
  );
  assert.equal(result, "INNLEID");
});

// ─── Edge case ───────────────────────────────────────────────────

test("Fallback: helt tomt input gir INNLEID (manuell default)", () => {
  // Verken RecmanCandidate, åpen periode eller manuell flagg — siste utvei.
  const result = resolveCategory(input());
  assert.equal(result, "INNLEID");
});

test("now-parameter: employeeEnd lik nå skal regnes som avsluttet", () => {
  const result = resolveCategory(
    input({
      recmanCandidate: { isEmployee: true, employeeEnd: NOW, isContractor: false },
    })
  );
  // employeeEnd === now betyr ansettelsen slutter i dag — ikke aktiv lenger.
  assert.equal(result, "KANDIDAT");
});
