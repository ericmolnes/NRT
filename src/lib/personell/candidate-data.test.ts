import assert from "node:assert/strict";
import test from "node:test";

import { buildLocalCandidateCreateData } from "./candidate-data";

test("buildLocalCandidateCreateData preserves mobilePhone separately from phone", () => {
  const data = buildLocalCandidateCreateData({
    recmanId: "123",
    input: {
      firstName: "Ola",
      lastName: "Nordmann",
      phone: "",
      mobilePhone: "+47 900 00 000",
    },
  });

  assert.equal(data.phone, "+47 900 00 000");
  assert.equal(data.mobilePhone, "+47 900 00 000");
});

test("buildLocalCandidateCreateData prefers verified RecMan identity fields", () => {
  const data = buildLocalCandidateCreateData({
    recmanId: "123",
    input: {
      firstName: "Ola",
      lastName: "Nordmann",
      email: "local@example.com",
      title: "Kandidat",
      city: "Bergen",
    },
    verified: {
      firstName: "Ole",
      lastName: "Hansen",
      email: "recman@example.com",
      title: "Elektriker",
      city: "Stavanger",
    },
  });

  assert.equal(data.firstName, "Ole");
  assert.equal(data.lastName, "Hansen");
  assert.equal(data.email, "recman@example.com");
  assert.equal(data.title, "Elektriker");
  assert.equal(data.city, "Stavanger");
});
