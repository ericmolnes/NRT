import assert from "node:assert/strict";
import test from "node:test";

import {
  acknowledgeConflictRemoteBase,
  buildAcknowledgedConflictBaseRawJson,
} from "./resolve-conflict-base";

test("buildAcknowledgedConflictBaseRawJson advances Recman base for the handled field", () => {
  const nextBase = buildAcknowledgedConflictBaseRawJson({
    model: "RecmanCandidate",
    field: "email",
    remoteValue: "remote@example.com",
    rawJson: JSON.stringify({
      email: "old@example.com",
      phone: "111",
    }),
  });

  assert.deepEqual(JSON.parse(String(nextBase)), {
    email: "remote@example.com",
    phone: "111",
  });
});

test("buildAcknowledgedConflictBaseRawJson maps POEmployee fields back to remote raw keys", () => {
  const nextBase = buildAcknowledgedConflictBaseRawJson({
    model: "POEmployee",
    field: "email",
    remoteValue: "remote@example.com",
    rawJson: JSON.stringify({
      emailAddress: "old@example.com",
      phoneNumber: "111",
    }),
  });

  assert.deepEqual(JSON.parse(String(nextBase)), {
    emailAddress: "remote@example.com",
    phoneNumber: "111",
  });
});

test("buildAcknowledgedConflictBaseRawJson returns null for unsupported conflict fields", () => {
  const nextBase = buildAcknowledgedConflictBaseRawJson({
    model: "POEmployee",
    field: "unknownField",
    remoteValue: "remote",
    rawJson: JSON.stringify({ emailAddress: "old@example.com" }),
  });

  assert.equal(nextBase, null);
});

test("acknowledgeConflictRemoteBase updates POEmployee rawJson in the transaction", async () => {
  const updates: Array<Record<string, unknown>> = [];
  let rawJson = JSON.stringify({
    emailAddress: "old@example.com",
    phoneNumber: "111",
  });

  const tx = {
    pOEmployee: {
      async findUnique(args: { where: { id: string } }) {
        assert.deepEqual(args.where, { id: "po-1" });
        return { rawJson };
      },
      async update(args: {
        where: { id: string };
        data: { rawJson: string };
      }) {
        updates.push(args);
        rawJson = args.data.rawJson;
        return { id: args.where.id };
      },
    },
  };

  await acknowledgeConflictRemoteBase(tx, {
    model: "POEmployee",
    recordId: "po-1",
    field: "email",
    remoteValue: "remote@example.com",
  });

  assert.equal(updates.length, 1);
  assert.deepEqual(JSON.parse(rawJson), {
    emailAddress: "remote@example.com",
    phoneNumber: "111",
  });
});

test("acknowledgeConflictRemoteBase updates RecmanCandidate rawJson in the transaction", async () => {
  const updates: Array<Record<string, unknown>> = [];
  let rawJson = JSON.stringify({
    email: "old@example.com",
    phone: "111",
  });

  const tx = {
    recmanCandidate: {
      async findUnique(args: { where: { id: string } }) {
        assert.deepEqual(args.where, { id: "candidate-1" });
        return { rawJson };
      },
      async update(args: {
        where: { id: string };
        data: { rawJson: string };
      }) {
        updates.push(args);
        rawJson = args.data.rawJson;
        return { id: args.where.id };
      },
    },
  };

  await acknowledgeConflictRemoteBase(tx, {
    model: "RecmanCandidate",
    recordId: "candidate-1",
    field: "email",
    remoteValue: "remote@example.com",
  });

  assert.equal(updates.length, 1);
  assert.deepEqual(JSON.parse(rawJson), {
    email: "remote@example.com",
    phone: "111",
  });
});
