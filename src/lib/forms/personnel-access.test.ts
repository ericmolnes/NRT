import assert from "node:assert/strict";
import test from "node:test";

import {
  isPersonnelAllowedForFormLink,
  parsePersonnelIds,
  toPersonForFilter,
} from "./personnel-access";

const activeEmployee = {
  id: "person_1",
  status: "ACTIVE",
  role: "Ansatt",
  department: null as string | null,
  recmanCandidate: {
    isEmployee: true,
    isContractor: false,
    employeeEnd: null as Date | null,
    corporationId: "2484",
    contractorPeriods: [],
  },
};

const activeContractor = {
  id: "person_2",
  status: "ACTIVE",
  role: "Innleid",
  department: null as string | null,
  recmanCandidate: {
    isEmployee: false,
    isContractor: true,
    employeeEnd: null as Date | null,
    corporationId: "2484",
    contractorPeriods: [],
  },
};

const candidate = {
  id: "person_3",
  status: "ACTIVE",
  role: "Kandidat",
  department: null as string | null,
  recmanCandidate: {
    isEmployee: false,
    isContractor: false,
    employeeEnd: null as Date | null,
    corporationId: "2485",
    contractorPeriods: [],
  },
};

const baseLink = {
  personnelId: null,
  personnelIds: null,
  roleFilter: null,
  categoriesFilter: null,
  departmentsFilter: null,
};

test("parsePersonnelIds keeps only valid string ids", () => {
  assert.deepEqual(parsePersonnelIds(["person_1", "", 7, "person_2"]), [
    "person_1",
    "person_2",
  ]);
});

test("isPersonnelAllowedForFormLink rejects people outside a multi-person link", () => {
  assert.equal(
    isPersonnelAllowedForFormLink(
      {
        ...baseLink,
        personnelIds: ["person_2"],
      },
      activeEmployee
    ),
    false
  );
});

test("isPersonnelAllowedForFormLink allows matching contractor via legacy roleFilter", () => {
  assert.equal(
    isPersonnelAllowedForFormLink(
      {
        ...baseLink,
        roleFilter: "Innleid",
      },
      activeContractor
    ),
    true
  );
});

test("isPersonnelAllowedForFormLink rejects archived personnel", () => {
  assert.equal(
    isPersonnelAllowedForFormLink(
      baseLink,
      { ...activeEmployee, status: "ARCHIVED" }
    ),
    false
  );
});

test("isPersonnelAllowedForFormLink restricts to selected categories", () => {
  // Lenken tillater kun KANDIDAT — ansatt og innleid skal blokkeres.
  const link = {
    ...baseLink,
    categoriesFilter: ["KANDIDAT"],
  };

  assert.equal(isPersonnelAllowedForFormLink(link, activeEmployee), false);
  assert.equal(isPersonnelAllowedForFormLink(link, activeContractor), false);
  assert.equal(isPersonnelAllowedForFormLink(link, candidate), true);
});

test("isPersonnelAllowedForFormLink restricts to selected departments", () => {
  const link = {
    ...baseLink,
    departmentsFilter: ["2484"],
  };

  assert.equal(isPersonnelAllowedForFormLink(link, activeEmployee), true);
  assert.equal(isPersonnelAllowedForFormLink(link, activeContractor), true);
  // Kandidaten er i 2485, ikke 2484.
  assert.equal(isPersonnelAllowedForFormLink(link, candidate), false);
});

test("isPersonnelAllowedForFormLink combines category and department filters as AND", () => {
  const link = {
    ...baseLink,
    categoriesFilter: ["ANSATT"],
    departmentsFilter: ["2484"],
  };

  // Ansatt i 2484 — alt riktig.
  assert.equal(isPersonnelAllowedForFormLink(link, activeEmployee), true);
  // Innleid i 2484 — feil kategori.
  assert.equal(isPersonnelAllowedForFormLink(link, activeContractor), false);
});

test("isPersonnelAllowedForFormLink prefers explicit categoriesFilter over legacy roleFilter", () => {
  // Eksplisitt KANDIDAT skal vinne over legacy "Ansatt".
  const link = {
    ...baseLink,
    categoriesFilter: ["KANDIDAT"],
    roleFilter: "Ansatt",
  };

  assert.equal(isPersonnelAllowedForFormLink(link, activeEmployee), false);
  assert.equal(isPersonnelAllowedForFormLink(link, candidate), true);
});

test("isPersonnelAllowedForFormLink falls back to Personnel.department when no recmanCandidate", () => {
  const manualContractor = {
    id: "person_4",
    status: "ACTIVE",
    role: "Innleid",
    department: "2484",
    recmanCandidate: null,
  };

  const link = {
    ...baseLink,
    departmentsFilter: ["2484"],
  };

  assert.equal(isPersonnelAllowedForFormLink(link, manualContractor), true);
});

test("isPersonnelAllowedForFormLink personnelIds list overrides category filter", () => {
  // Person er ANSATT, men lenka tillater kun KANDIDAT — likevel skal
  // personnelIds-liste overstyre.
  const link = {
    ...baseLink,
    personnelIds: ["person_1"],
    categoriesFilter: ["KANDIDAT"],
  };

  assert.equal(isPersonnelAllowedForFormLink(link, activeEmployee), true);
  assert.equal(isPersonnelAllowedForFormLink(link, candidate), false);
});

test("toPersonForFilter resolves former employee with open contractor period as INNLEID", () => {
  const formerEmployeeNowContractor = {
    id: "person_5",
    status: "ACTIVE",
    role: "Ansatt",
    department: null as string | null,
    recmanCandidate: {
      isEmployee: true,
      isContractor: false,
      employeeEnd: new Date("2025-01-01T00:00:00Z"),
      corporationId: "2484",
      contractorPeriods: [{ endDate: null as Date | null }],
    },
  };

  assert.deepEqual(
    toPersonForFilter(
      formerEmployeeNowContractor,
      new Date("2026-04-29T00:00:00Z")
    ),
    {
      id: "person_5",
      category: "INNLEID",
      department: "2484",
    }
  );
});

test("toPersonForFilter falls back to Personnel.department for manual personnel", () => {
  const manualContractor = {
    id: "person_6",
    status: "ACTIVE",
    role: "Innleid",
    department: "2484",
    recmanCandidate: null,
  };

  assert.deepEqual(toPersonForFilter(manualContractor), {
    id: "person_6",
    category: "INNLEID",
    department: "2484",
  });
});
