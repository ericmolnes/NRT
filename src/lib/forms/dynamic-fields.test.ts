import assert from "node:assert/strict";
import test from "node:test";

import {
  getDynamicFieldValue,
  validateDynamicFieldValue,
} from "./dynamic-fields";

const booleanField = {
  id: "field_boolean",
  name: "Har sertifikat",
  type: "BOOLEAN",
  options: null,
  required: true,
};

test("getDynamicFieldValue stores unchecked boolean fields as false", () => {
  const formData = new FormData();

  assert.equal(getDynamicFieldValue(formData, booleanField), "false");
});

test("validateDynamicFieldValue accepts required boolean false", () => {
  assert.equal(validateDynamicFieldValue(booleanField, "false"), null);
});

test("validateDynamicFieldValue rejects missing required text fields", () => {
  assert.equal(
    validateDynamicFieldValue(
      {
        id: "field_text",
        name: "Kommentar",
        type: "TEXT",
        options: null,
        required: true,
      },
      ""
    ),
    "Kommentar er påkrevd"
  );
});

test("validateDynamicFieldValue rejects select values outside options", () => {
  assert.equal(
    validateDynamicFieldValue(
      {
        id: "field_select",
        name: "Størrelse",
        type: "SELECT",
        options: "S, M, L",
        required: false,
      },
      "XL"
    ),
    "Størrelse har en ugyldig verdi"
  );
});
