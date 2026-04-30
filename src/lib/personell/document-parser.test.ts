import assert from "node:assert/strict";
import test from "node:test";

import { parseCourseDocument } from "./document-parser";

test("parseCourseDocument normaliserer kursmetadata og datoer", () => {
  const result = parseCourseDocument({
    fileName: "fallsikring-bevis.pdf",
    text: [
      "Kurs: Fallsikring",
      "Utsteder: Nordic Safety AS",
      "Sertifikatnr: FS-2026-0042",
      "Utstedt: 29.04.2026",
      "Utloper: 29.04.2028",
    ].join("\n"),
  });

  assert.equal(result.status, "SUGGESTIONS_CREATED");
  assert.equal(result.suggestions.length, 1);
  assert.deepEqual(result.suggestions[0], {
    name: "Fallsikring",
    issuer: "Nordic Safety AS",
    certificateNumber: "FS-2026-0042",
    issueDate: "2026-04-29",
    expiryDate: "2028-04-29",
    confidence: 0.9,
    sourceText:
      "Kurs: Fallsikring\nUtsteder: Nordic Safety AS\nSertifikatnr: FS-2026-0042\nUtstedt: 29.04.2026\nUtloper: 29.04.2028",
  });
});

test("parseCourseDocument bruker filnavn som svakt forslag når tekst mangler", () => {
  const result = parseCourseDocument({
    fileName: "G11 Stropp Anhukerbevis.pdf",
    text: "",
  });

  assert.equal(result.status, "SUGGESTIONS_CREATED");
  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].name, "G11 Stropp Anhukerbevis");
  assert.equal(result.suggestions[0].issueDate, null);
  assert.equal(result.suggestions[0].expiryDate, null);
  assert.equal(result.suggestions[0].confidence, 0.35);
});

test("parseCourseDocument returnerer ingen forslag for stoy uten kursindikatorer", () => {
  const result = parseCourseDocument({
    fileName: "scan-001.pdf",
    text: "Side 1 av 2\nDette er en uleselig skanning med tilfeldig tekst.",
  });

  assert.equal(result.status, "NO_SUGGESTIONS");
  assert.deepEqual(result.suggestions, []);
});

test("parseCourseDocument holder parseren ren uten persistensfelter", () => {
  const result = parseCourseDocument({
    fileName: "hot-work.txt",
    text: "Course: Hot Work\nIssuer: SafeCert\nExpires: 2027-12-31",
  });

  assert.equal("personnelId" in result.suggestions[0], false);
  assert.equal("status" in result.suggestions[0], false);
  assert.equal("id" in result.suggestions[0], false);
});
