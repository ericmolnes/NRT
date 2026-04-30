import assert from "node:assert/strict";
import test from "node:test";

import {
  approveCourseRecord,
  correctAndApproveCourseRecord,
  createCourseRecord,
  rejectCourseRecord,
  storePersonnelDocument,
  type CourseRecordsClient,
} from "./course-records";

type Row = Record<string, unknown> & { id: string };

function makeClient(): CourseRecordsClient & {
  rows: {
    documents: Row[];
    records: Row[];
    logs: Row[];
    entries: Row[];
  };
  hooks: {
    beforeUpdateMany?: () => void;
  };
} {
  const rows = {
    documents: [] as Row[],
    records: [] as Row[],
    logs: [] as Row[],
    entries: [] as Row[],
  };
  const hooks: { beforeUpdateMany?: () => void } = {};
  let nextId = 1;
  const id = (prefix: string) => `${prefix}_${nextId++}`;

  const client: CourseRecordsClient = {
    async $transaction<T>(fn: (tx: CourseRecordsClient) => Promise<T>): Promise<T> {
      return fn(client);
    },
    personnelDocument: {
      async create(args) {
        const row = {
          id: id("doc"),
          uploadedAt: new Date("2026-04-29T10:00:00Z"),
          ...args.data,
        };
        rows.documents.push(row);
        return row;
      },
      async update(args) {
        const row = rows.documents.find((item) => item.id === args.where.id);
        if (!row) throw new Error("document not found");
        Object.assign(row, args.data);
        return row;
      },
    },
    personnelCourseRecord: {
      async create(args) {
        const row = {
          id: id("course"),
          createdAt: new Date("2026-04-29T10:00:00Z"),
          updatedAt: new Date("2026-04-29T10:00:00Z"),
          ...args.data,
        };
        rows.records.push(row);
        return row;
      },
      async findUnique(args) {
        return rows.records.find((item) => item.id === args.where.id) ?? null;
      },
      async update(args) {
        const row = rows.records.find((item) => item.id === args.where.id);
        if (!row) throw new Error("record not found");
        Object.assign(row, args.data);
        return row;
      },
      async updateMany(args) {
        hooks.beforeUpdateMany?.();
        const row = rows.records.find(
          (item) =>
            item.id === args.where.id &&
            item.personnelId === args.where.personnelId &&
            item.status === args.where.status
        );
        if (!row) return { count: 0 };
        Object.assign(row, args.data);
        return { count: 1 };
      },
    },
    changeLog: {
      async create(args) {
        const row = {
          id: id("log"),
          createdAt: new Date("2026-04-29T10:00:00Z"),
          ...args.data,
        };
        rows.logs.push(row);
        return row;
      },
    },
    changeLogEntry: {
      async createMany(args) {
        for (const entry of args.data) {
          rows.entries.push({
            id: id("entry"),
            createdAt: new Date("2026-04-29T10:00:00Z"),
            ...entry,
          });
        }
        return { count: args.data.length };
      },
    },
  };

  return Object.assign(client, { rows, hooks });
}

const actor = { id: "user_1", name: "Ola Nordmann" };

test("storePersonnelDocument lagrer metadata og AI-forslag i samme auditspor", async () => {
  const client = makeClient();

  const result = await storePersonnelDocument(client, {
    personnelId: "person_1",
    fileName: "fallsikring.pdf",
    mimeType: "application/pdf",
    sizeBytes: 42_000,
    uploadedBy: actor,
    parserStatus: "SUGGESTIONS_CREATED",
    parserSummary: "Fant 1 kursforslag",
    suggestions: [
      {
        name: "Fallsikring",
        issuer: "Nordic Safety AS",
        certificateNumber: "FS-42",
        issueDate: "2026-04-29",
        expiryDate: "2028-04-29",
        confidence: 0.9,
      },
    ],
  });

  assert.equal(result.document.fileName, "fallsikring.pdf");
  assert.equal(result.courseRecords.length, 1);
  assert.equal(result.courseRecords[0].status, "SUGGESTED");
  assert.equal(result.courseRecords[0].source, "AI");
  assert.equal(result.courseRecords[0].documentId, result.document.id);
  assert.equal(client.rows.logs.length, 1);
  assert.equal(client.rows.logs[0].source, "AI_ASSISTANT");
  assert.equal(client.rows.entries.some((entry) => entry.model === "PersonnelDocument"), true);
  assert.equal(client.rows.entries.some((entry) => entry.model === "PersonnelCourseRecord"), true);
});

test("storePersonnelDocument lagrer dokument selv uten forslag", async () => {
  const client = makeClient();

  const result = await storePersonnelDocument(client, {
    personnelId: "person_1",
    fileName: "scan.pdf",
    uploadedBy: actor,
    parserStatus: "NO_SUGGESTIONS",
    parserSummary: "Ingen kurs funnet",
    suggestions: [],
  });

  assert.equal(result.document.parserStatus, "NO_SUGGESTIONS");
  assert.deepEqual(result.courseRecords, []);
  assert.equal(client.rows.documents.length, 1);
  assert.equal(client.rows.records.length, 0);
});

test("createCourseRecord oppretter manuell kursrad som godkjent", async () => {
  const client = makeClient();

  const record = await createCourseRecord(client, {
    personnelId: "person_1",
    actor,
    name: "Varmt arbeid",
    issuer: "Brannvernforeningen",
    issueDate: "2026-01-10",
    expiryDate: "2031-01-10",
  });

  assert.equal(record.status, "APPROVED");
  assert.equal(record.source, "MANUAL");
  assert.equal(record.approvedById, "user_1");
  assert.equal(client.rows.logs[0].source, "USER_ACTION");
});

test("approveCourseRecord godkjenner forslag uten aa endre kursfelt", async () => {
  const client = makeClient();
  const suggested = await createCourseRecord(client, {
    personnelId: "person_1",
    actor,
    source: "AI",
    status: "SUGGESTED",
    name: "Fallsikring",
    aiConfidence: 0.8,
  });

  const approved = await approveCourseRecord(client, {
    id: suggested.id,
    personnelId: "person_1",
    actor,
  });

  assert.equal(approved.status, "APPROVED");
  assert.equal(approved.approvedByName, "Ola Nordmann");
  assert.equal(client.rows.entries.some((entry) => entry.field === "status" && entry.newValue === "APPROVED"), true);
  const approvedAtEntry = client.rows.entries.find((entry) => entry.field === "approvedAt");
  assert.equal(typeof approvedAtEntry?.newValue, "string");
});

test("correctAndApproveCourseRecord oppdaterer felt og godkjenner i ett auditspor", async () => {
  const client = makeClient();
  const suggested = await createCourseRecord(client, {
    personnelId: "person_1",
    actor,
    source: "AI",
    status: "SUGGESTED",
    name: "Falsikring",
    expiryDate: null,
  });

  const corrected = await correctAndApproveCourseRecord(client, {
    id: suggested.id,
    personnelId: "person_1",
    actor,
    correction: {
      name: "Fallsikring",
      expiryDate: "2028-04-29",
    },
  });

  assert.equal(corrected.name, "Fallsikring");
  assert.equal(corrected.status, "APPROVED");
  const latestLog = client.rows.logs.at(-1);
  assert.equal(latestLog?.summary, "Korrigerte og godkjente kurs: Fallsikring");
  assert.equal(client.rows.entries.some((entry) => entry.field === "name" && entry.oldValue === "Falsikring"), true);
});

test("rejectCourseRecord markerer forslag som avvist med begrunnelse", async () => {
  const client = makeClient();
  const suggested = await createCourseRecord(client, {
    personnelId: "person_1",
    actor,
    source: "AI",
    status: "SUGGESTED",
    name: "Uleselig kurs",
  });

  const rejected = await rejectCourseRecord(client, {
    id: suggested.id,
    personnelId: "person_1",
    actor,
    reason: "Feil person",
  });

  assert.equal(rejected.status, "REJECTED");
  assert.equal(rejected.rejectionReason, "Feil person");
  assert.equal(rejected.rejectedById, "user_1");
  assert.equal(client.rows.records.length, 1, "avviste forslag skal ikke slettes");
  assert.equal(client.rows.entries.some((entry) => entry.field === "rejectionReason"), true);
  const rejectedAtEntry = client.rows.entries.find((entry) => entry.field === "rejectedAt");
  assert.equal(typeof rejectedAtEntry?.newValue, "string");
});

test("course actions avviser personnelId-mismatch foer mutasjon", async () => {
  const client = makeClient();
  const suggested = await createCourseRecord(client, {
    personnelId: "person_1",
    actor,
    source: "AI",
    status: "SUGGESTED",
    name: "Fallsikring",
  });

  await assert.rejects(
    approveCourseRecord(client, {
      id: suggested.id,
      personnelId: "person_2",
      actor,
    }),
    /tilhorer ikke personell/
  );

  assert.equal(client.rows.records[0].status, "SUGGESTED");
});

test("approveCourseRecord avviser ugyldig overgang", async () => {
  const client = makeClient();
  const manual = await createCourseRecord(client, {
    personnelId: "person_1",
    actor,
    name: "Varmt arbeid",
  });

  await assert.rejects(
    approveCourseRecord(client, {
      id: manual.id,
      personnelId: "person_1",
      actor,
    }),
    /kan bare behandles fra SUGGESTED/
  );
});

test("approveCourseRecord avviser stale status via betinget oppdatering", async () => {
  const client = makeClient();
  const suggested = await createCourseRecord(client, {
    personnelId: "person_1",
    actor,
    source: "AI",
    status: "SUGGESTED",
    name: "Fallsikring",
  });
  const logCountBefore = client.rows.logs.length;

  client.hooks.beforeUpdateMany = () => {
    const row = client.rows.records.find((record) => record.id === suggested.id);
    if (row) row.status = "APPROVED";
    client.hooks.beforeUpdateMany = undefined;
  };

  await assert.rejects(
    approveCourseRecord(client, {
      id: suggested.id,
      personnelId: "person_1",
      actor,
    }),
    /status er endret/
  );

  assert.equal(client.rows.logs.length, logCountBefore);
});

test("course helpers validerer korrigering og avvisningsgrunn", async () => {
  const client = makeClient();
  const suggested = await createCourseRecord(client, {
    personnelId: "person_1",
    actor,
    source: "AI",
    status: "SUGGESTED",
    name: "Fallsikring",
  });

  await assert.rejects(
    correctAndApproveCourseRecord(client, {
      id: suggested.id,
      personnelId: "person_1",
      actor,
      correction: { name: " ", expiryDate: "29/04/2028" },
    }),
    /Kursnavn er paakrevd/
  );

  await assert.rejects(
    rejectCourseRecord(client, {
      id: suggested.id,
      personnelId: "person_1",
      actor,
      reason: " ",
    }),
    /Avvisning krever begrunnelse/
  );
});
