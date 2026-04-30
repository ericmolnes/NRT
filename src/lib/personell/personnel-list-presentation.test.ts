import assert from "node:assert/strict";
import test from "node:test";

import {
  getPersonnelListPresentation,
  type PersonnelListPresentationInput,
} from "./personnel-list-presentation";

function makeRow(
  overrides: Partial<PersonnelListPresentationInput> = {}
): PersonnelListPresentationInput {
  return {
    id: "p_1",
    source: "PERSONNEL",
    personnelId: "p_1",
    recmanCandidateId: "rc_1",
    name: "Ola Nordmann",
    role: "Tekniker",
    department: "Drift",
    category: "ANSATT",
    poEmployee: null,
    recmanCandidate: null,
    evaluations: [],
    ...overrides,
  };
}

test("getPersonnelListPresentation links personnel rows to personnel detail", () => {
  const view = getPersonnelListPresentation(makeRow());

  assert.equal(view.href, "/personell/p_1");
  assert.equal(view.categoryLabel, "Ansatt");
  assert.deepEqual(view.syncLabels, []);
});

test("getPersonnelListPresentation links RecMan-only rows to RecMan detail", () => {
  const view = getPersonnelListPresentation(
    makeRow({
      id: "rc:rc_9",
      source: "RECMAN_ONLY",
      personnelId: null,
      recmanCandidateId: "rc_9",
      category: "KANDIDAT",
      role: null,
    })
  );

  assert.equal(view.href, "/recman/rc_9");
  assert.equal(view.categoryLabel, "Kandidat");
  assert.equal(view.displayRole, "-");
});

test("getPersonnelListPresentation falls back to RecMan title and row department", () => {
  const view = getPersonnelListPresentation(
    makeRow({
      role: null,
      department: "2484",
      recmanCandidate: {
        id: "rc_1",
        recmanId: "rec-1",
        firstName: "Ola",
        lastName: "Nordmann",
        email: null,
        phone: null,
        title: "Borer",
        city: null,
        rating: 0,
        imageUrl: null,
        isEmployee: false,
        employeeNumber: null,
        employeeStart: null,
        employeeEnd: null,
        isContractor: true,
        skills: null,
        languages: null,
        driversLicense: null,
        lastSyncedAt: new Date("2026-04-29T00:00:00Z"),
        contractorPeriods: [],
      },
    })
  );

  assert.equal(view.displayRole, "Borer");
  assert.equal(view.displayDepartment, "2484");
});

test("getPersonnelListPresentation emits sync labels for PO and RecMan", () => {
  const view = getPersonnelListPresentation(
    makeRow({
      poEmployee: {
        id: "po_1",
        lastSyncedAt: new Date("2026-04-29T00:00:00Z"),
        isActive: true,
        department: "Drift",
      },
      recmanCandidate: {
        id: "rc_1",
        recmanId: "rec-1",
        firstName: "Ola",
        lastName: "Nordmann",
        email: null,
        phone: null,
        title: null,
        city: null,
        rating: 0,
        imageUrl: null,
        isEmployee: true,
        employeeNumber: null,
        employeeStart: null,
        employeeEnd: null,
        isContractor: false,
        skills: null,
        languages: null,
        driversLicense: null,
        lastSyncedAt: new Date("2026-04-29T00:00:00Z"),
        contractorPeriods: [],
      },
    })
  );

  assert.deepEqual(view.syncLabels, ["PO", "Recman"]);
});
