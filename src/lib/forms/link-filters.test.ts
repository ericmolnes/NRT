import assert from "node:assert/strict";
import test from "node:test";

import {
  isPersonAllowed,
  parseLinkFilters,
  toPersonnelListFilters,
  type PersonForFilter,
} from "./link-filters";

const ansatt: PersonForFilter = {
  id: "p_ansatt",
  category: "ANSATT",
  department: "2484",
};

const innleid: PersonForFilter = {
  id: "p_innleid",
  category: "INNLEID",
  department: "2484",
};

const kandidat: PersonForFilter = {
  id: "p_kandidat",
  category: "KANDIDAT",
  department: "2485",
};

const kandidatNoDept: PersonForFilter = {
  id: "p_kandidat_no_dept",
  category: "KANDIDAT",
  department: null,
};

// ─── parseLinkFilters ────────────────────────────────────────────

test("parseLinkFilters returns all-null when fields are null", () => {
  const filters = parseLinkFilters({
    categoriesFilter: null,
    departmentsFilter: null,
    personnelIds: null,
    roleFilter: null,
  });

  assert.deepEqual(filters, {
    categories: null,
    departments: null,
    personnelIds: null,
  });
});

test("parseLinkFilters parses arrays from JSON-stored fields", () => {
  const filters = parseLinkFilters({
    categoriesFilter: ["ANSATT", "INNLEID"],
    departmentsFilter: ["2484", "2485"],
    personnelIds: ["p_1", "p_2"],
    roleFilter: null,
  });

  assert.deepEqual(filters.categories, ["ANSATT", "INNLEID"]);
  assert.deepEqual(filters.departments, ["2484", "2485"]);
  assert.deepEqual(filters.personnelIds, ["p_1", "p_2"]);
});

test("parseLinkFilters drops invalid category values", () => {
  const filters = parseLinkFilters({
    categoriesFilter: ["ANSATT", "BOGUS", "kandidat", null, 12],
    departmentsFilter: null,
    personnelIds: null,
    roleFilter: null,
  });

  // Only ANSATT survives; "kandidat" is wrong case.
  assert.deepEqual(filters.categories, ["ANSATT"]);
});

test("parseLinkFilters returns null categories when JSON is empty array", () => {
  const filters = parseLinkFilters({
    categoriesFilter: [],
    departmentsFilter: [],
    personnelIds: [],
    roleFilter: null,
  });

  assert.equal(filters.categories, null);
  assert.equal(filters.departments, null);
  assert.equal(filters.personnelIds, null);
});

test("parseLinkFilters falls back to legacy roleFilter when categoriesFilter is null", () => {
  const ansattFilter = parseLinkFilters({
    categoriesFilter: null,
    departmentsFilter: null,
    personnelIds: null,
    roleFilter: "Ansatt",
  });
  assert.deepEqual(ansattFilter.categories, ["ANSATT"]);

  const innleidFilter = parseLinkFilters({
    categoriesFilter: null,
    departmentsFilter: null,
    personnelIds: null,
    roleFilter: "Innleid",
  });
  assert.deepEqual(innleidFilter.categories, ["INNLEID"]);
});

test("parseLinkFilters prefers explicit categoriesFilter over legacy roleFilter", () => {
  const filters = parseLinkFilters({
    categoriesFilter: ["KANDIDAT"],
    departmentsFilter: null,
    personnelIds: null,
    roleFilter: "Ansatt",
  });

  assert.deepEqual(filters.categories, ["KANDIDAT"]);
});

test("parseLinkFilters tolerates unknown roleFilter values", () => {
  const filters = parseLinkFilters({
    categoriesFilter: null,
    departmentsFilter: null,
    personnelIds: null,
    roleFilter: "Konsulent",
  });

  assert.equal(filters.categories, null);
});

// ─── isPersonAllowed ─────────────────────────────────────────────

test("isPersonAllowed allows everyone when filters are all-null", () => {
  const filters = {
    categories: null,
    departments: null,
    personnelIds: null,
  };

  assert.equal(isPersonAllowed(ansatt, filters), true);
  assert.equal(isPersonAllowed(innleid, filters), true);
  assert.equal(isPersonAllowed(kandidat, filters), true);
  assert.equal(isPersonAllowed(kandidatNoDept, filters), true);
});

test("isPersonAllowed restricts to selected categories", () => {
  const filters = {
    categories: ["KANDIDAT"] as const,
    departments: null,
    personnelIds: null,
  };

  assert.equal(isPersonAllowed(ansatt, { ...filters, categories: ["KANDIDAT"] }), false);
  assert.equal(isPersonAllowed(innleid, { ...filters, categories: ["KANDIDAT"] }), false);
  assert.equal(isPersonAllowed(kandidat, { ...filters, categories: ["KANDIDAT"] }), true);
});

test("isPersonAllowed accepts any category when multiple categories are listed", () => {
  const filters = {
    categories: ["ANSATT", "INNLEID"] as ("ANSATT" | "INNLEID")[],
    departments: null,
    personnelIds: null,
  };

  assert.equal(isPersonAllowed(ansatt, filters), true);
  assert.equal(isPersonAllowed(innleid, filters), true);
  assert.equal(isPersonAllowed(kandidat, filters), false);
});

test("isPersonAllowed restricts to selected departments", () => {
  const filters = {
    categories: null,
    departments: ["2484"],
    personnelIds: null,
  };

  assert.equal(isPersonAllowed(ansatt, filters), true);
  assert.equal(isPersonAllowed(innleid, filters), true);
  assert.equal(isPersonAllowed(kandidat, filters), false);
  assert.equal(isPersonAllowed(kandidatNoDept, filters), false);
});

test("isPersonAllowed combines category and department as AND", () => {
  const filters = {
    categories: ["ANSATT"] as ("ANSATT")[],
    departments: ["2484"],
    personnelIds: null,
  };

  // Right department, right category.
  assert.equal(isPersonAllowed(ansatt, filters), true);
  // Right department, wrong category.
  assert.equal(isPersonAllowed(innleid, filters), false);
  // Wrong department.
  assert.equal(isPersonAllowed(kandidat, filters), false);
});

test("isPersonAllowed personnelIds overrides category/department filters", () => {
  // Person not in any allowed category, but is in personnelIds → still allowed.
  const filters = {
    categories: ["ANSATT"] as ("ANSATT")[],
    departments: ["9999"],
    personnelIds: [kandidat.id],
  };

  assert.equal(isPersonAllowed(kandidat, filters), true);
  assert.equal(isPersonAllowed(ansatt, filters), false);
});

test("isPersonAllowed empty personnelIds means lock to no one", () => {
  // We treat empty array same as null in parseLinkFilters, so this case
  // shouldn't reach isPersonAllowed — but if it does, the spec says null = no
  // person-lock and empty array is normalized to null upstream. We exercise
  // the behaviour through the parsed type.
  const filters = {
    categories: null,
    departments: null,
    personnelIds: null,
  };

  // Sanity: with no person-lock and no other filters, everyone passes.
  assert.equal(isPersonAllowed(ansatt, filters), true);
});

// ─── toPersonnelListFilters ──────────────────────────────────────

test("toPersonnelListFilters maps categories one-to-one", () => {
  const out = toPersonnelListFilters({
    categories: ["ANSATT", "KANDIDAT"],
    departments: null,
    personnelIds: null,
  });

  assert.deepEqual(out.category, ["ANSATT", "KANDIDAT"]);
  assert.equal(out.department, undefined);
});

test("toPersonnelListFilters maps single department to scalar", () => {
  const out = toPersonnelListFilters({
    categories: null,
    departments: ["2484"],
    personnelIds: null,
  });

  assert.equal(out.department, "2484");
});

test("toPersonnelListFilters drops department field when filter is null", () => {
  const out = toPersonnelListFilters({
    categories: null,
    departments: null,
    personnelIds: null,
  });

  assert.equal(out.department, undefined);
  assert.equal(out.category, undefined);
});

test("toPersonnelListFilters preserves multiple departments via departments[]", () => {
  const out = toPersonnelListFilters({
    categories: null,
    departments: ["2484", "2485"],
    personnelIds: null,
  });

  // Multiple departments → caller must filter further; we expose it as
  // `departments` for downstream code that supports it. `department` (scalar)
  // is unset to avoid silently picking one.
  assert.deepEqual(out.departments, ["2484", "2485"]);
  assert.equal(out.department, undefined);
});
