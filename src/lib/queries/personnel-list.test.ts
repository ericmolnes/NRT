import assert from "node:assert/strict";
import test from "node:test";

import {
  applyJsonPostFilters,
  mergeRows,
  personnelToRow,
  recmanCandidateToRow,
  type PersonnelRowInput,
  type PersonnelishRow,
  type RecmanCandidateRowInput,
} from "./personnel-list";

// ─── Hjelpere ────────────────────────────────────────────────────

const NOW = new Date("2026-04-28T12:00:00Z");
const PAST = new Date("2024-01-01T00:00:00Z");

function makePersonnelInput(
  overrides: Partial<PersonnelRowInput> = {}
): PersonnelRowInput {
  return {
    id: "p_1",
    name: "Ola Nordmann",
    email: "ola@nrt.no",
    phone: null,
    role: "Tekniker",
    department: null,
    evaluations: [],
    poEmployee: null,
    recmanCandidate: null,
    ...overrides,
  };
}

function makeRcInput(
  overrides: Partial<RecmanCandidateRowInput> = {}
): RecmanCandidateRowInput {
  return {
    id: "rc_1",
    recmanId: "rec-1",
    corporationId: null,
    firstName: "Kari",
    lastName: "Hansen",
    email: "kari@example.com",
    phone: null,
    title: "Borer",
    city: "Stavanger",
    rating: 4,
    imageUrl: null,
    isEmployee: false,
    employeeNumber: null,
    employeeStart: null,
    employeeEnd: null,
    isContractor: false,
    skills: null,
    languages: null,
    driversLicense: null,
    lastSyncedAt: NOW,
    contractorPeriods: [],
    ...overrides,
  };
}

// ─── personnelToRow ──────────────────────────────────────────────

test("personnelToRow: manuelt Personnel uten RecmanCandidate er INNLEID", () => {
  const row = personnelToRow(makePersonnelInput(), NOW);
  assert.equal(row.source, "PERSONNEL");
  assert.equal(row.personnelId, "p_1");
  assert.equal(row.recmanCandidateId, null);
  assert.equal(row.category, "INNLEID");
  assert.equal(row.id, "p_1");
  assert.equal(row.name, "Ola Nordmann");
});

test("personnelToRow: koblet RecmanCandidate med ansatt-flagg er ANSATT", () => {
  const row = personnelToRow(
    makePersonnelInput({
      recmanCandidate: makeRcInput({
        isEmployee: true,
        employeeEnd: null,
      }),
    }),
    NOW
  );
  assert.equal(row.category, "ANSATT");
  assert.equal(row.recmanCandidate?.id, "rc_1");
});

test("personnelToRow: rc med åpen ContractorPeriod er INNLEID", () => {
  const row = personnelToRow(
    makePersonnelInput({
      recmanCandidate: makeRcInput({
        contractorPeriods: [
          {
            id: "cp1",
            startDate: PAST,
            endDate: null,
            company: "Test AS",
            notes: null,
          },
        ],
      }),
    }),
    NOW
  );
  assert.equal(row.category, "INNLEID");
});

test("personnelToRow: department fallback til poEmployee.department", () => {
  const row = personnelToRow(
    makePersonnelInput({
      department: null,
      poEmployee: {
        id: "po1",
        lastSyncedAt: NOW,
        isActive: true,
        department: "Drift",
      },
    }),
    NOW
  );
  assert.equal(row.department, "Drift");
});

// ─── recmanCandidateToRow ────────────────────────────────────────

test("recmanCandidateToRow: ren kandidat (ingen ansatt/innleid) blir KANDIDAT", () => {
  const row = recmanCandidateToRow(makeRcInput(), NOW);
  assert.equal(row.source, "RECMAN_ONLY");
  assert.equal(row.id, "rc:rc_1");
  assert.equal(row.personnelId, null);
  assert.equal(row.recmanCandidateId, "rc_1");
  assert.equal(row.category, "KANDIDAT");
  assert.equal(row.name, "Kari Hansen");
});

test("recmanCandidateToRow: isContractor=true blir INNLEID", () => {
  const row = recmanCandidateToRow(
    makeRcInput({ isContractor: true }),
    NOW
  );
  assert.equal(row.category, "INNLEID");
});

// ─── mergeRows ───────────────────────────────────────────────────

test("mergeRows: dropper RecmanCandidate-rad som allerede er representert via Personnel", () => {
  const personnelRow = personnelToRow(
    makePersonnelInput({
      id: "p_1",
      name: "Ola",
      recmanCandidate: makeRcInput({ id: "shared_rc" }),
    }),
    NOW
  );
  const recmanRow = recmanCandidateToRow(
    makeRcInput({ id: "shared_rc", firstName: "Ola2" }),
    NOW
  );

  const merged = mergeRows([personnelRow], [recmanRow]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].source, "PERSONNEL");
});

test("mergeRows: beholder RecmanCandidate-rader som ikke matcher noen Personnel", () => {
  const personnelRow = personnelToRow(
    makePersonnelInput({ id: "p_1", name: "Anne" }),
    NOW
  );
  const recmanRow = recmanCandidateToRow(
    makeRcInput({ id: "lonely_rc", firstName: "Bjarne", lastName: "Berg" }),
    NOW
  );

  const merged = mergeRows([personnelRow], [recmanRow]);
  assert.equal(merged.length, 2);
  // Sortert på navn — Anne før Bjarne.
  assert.equal(merged[0].name, "Anne");
  assert.equal(merged[1].name, "Bjarne Berg");
});

test("mergeRows: sorterer alfabetisk på navn (norsk)", () => {
  const rows: PersonnelishRow[] = [
    personnelToRow(makePersonnelInput({ id: "p1", name: "Øystein" }), NOW),
    personnelToRow(makePersonnelInput({ id: "p2", name: "Anders" }), NOW),
    personnelToRow(makePersonnelInput({ id: "p3", name: "Birger" }), NOW),
  ];
  const merged = mergeRows(rows, []);
  assert.deepEqual(
    merged.map((r) => r.name),
    ["Anders", "Birger", "Øystein"]
  );
});

// ─── applyJsonPostFilters ────────────────────────────────────────

test("applyJsonPostFilters: filtrerer på skill-kategori", () => {
  // Ex/ATEX-kategori inneholder bl.a. nøkkelordet "atex". Lager én rad som
  // matcher (har skill med "ATEX") og én som ikke gjør det.
  const rowMatch = recmanCandidateToRow(
    makeRcInput({
      id: "a",
      firstName: "Match",
      skills: [{ name: "ATEX-utstyr klasse 2" }],
    }),
    NOW
  );
  const rowNoMatch = recmanCandidateToRow(
    makeRcInput({
      id: "b",
      firstName: "NoMatch",
      skills: [{ name: "Generell mekanikk" }],
    }),
    NOW
  );
  const filtered = applyJsonPostFilters([rowMatch, rowNoMatch], {
    skill: "Ex/ATEX",
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, "Match Hansen");
});

test("applyJsonPostFilters: filtrerer på førerkort", () => {
  const rowB = recmanCandidateToRow(
    makeRcInput({ id: "a", firstName: "BHaver", driversLicense: ["B"] }),
    NOW
  );
  const rowCE = recmanCandidateToRow(
    makeRcInput({ id: "b", firstName: "CEHaver", driversLicense: ["CE"] }),
    NOW
  );
  const filtered = applyJsonPostFilters([rowB, rowCE], { license: "CE" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, "CEHaver Hansen");
});

test("applyJsonPostFilters: filtrerer på språk (case-insensitive)", () => {
  const rowEng = recmanCandidateToRow(
    makeRcInput({
      id: "a",
      firstName: "Eng",
      languages: [{ name: "English" }],
    }),
    NOW
  );
  const rowNor = recmanCandidateToRow(
    makeRcInput({
      id: "b",
      firstName: "Nor",
      languages: [{ name: "Norsk" }],
    }),
    NOW
  );
  const filtered = applyJsonPostFilters([rowEng, rowNor], { language: "ENGL" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, "Eng Hansen");
});

test("applyJsonPostFilters: ingen filtre returnerer alle", () => {
  const row = recmanCandidateToRow(makeRcInput(), NOW);
  const filtered = applyJsonPostFilters([row], {});
  assert.equal(filtered.length, 1);
});

// ─── Integrasjonsoppførsel: kategori KANDIDAT inkluderer både kilder ──

test("kategori-blandet liste: Personnel og RecmanCandidate i samme resultat", () => {
  // Simulerer det `getPersonnelishList` returnerer for KANDIDAT-kategorien:
  // Personnel-koblede kandidater og rene RecmanCandidate-rader, slått sammen.
  const personnelKandidat = personnelToRow(
    makePersonnelInput({
      id: "p_kandidat",
      name: "Personnel Kandidat",
      recmanCandidate: makeRcInput({ id: "rc_personnel" }),
    }),
    NOW
  );
  const recmanOnlyKandidat = recmanCandidateToRow(
    makeRcInput({
      id: "rc_only",
      firstName: "Only",
      lastName: "Recman",
    }),
    NOW
  );

  const merged = mergeRows([personnelKandidat], [recmanOnlyKandidat]);
  assert.equal(merged.length, 2);
  // Sjekk at begge kategoriene er KANDIDAT.
  assert.ok(merged.every((r) => r.category === "KANDIDAT"));
  // Begge kildene er representert.
  const sources = new Set(merged.map((r) => r.source));
  assert.deepEqual([...sources].sort(), ["PERSONNEL", "RECMAN_ONLY"]);
});
