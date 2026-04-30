import type { CourseSuggestion } from "./document-parser";

export type Actor = {
  id: string;
  name: string;
};

type ParserStatus =
  | "NOT_RUN"
  | "SUGGESTIONS_CREATED"
  | "NO_SUGGESTIONS"
  | "FAILED";

type CourseStatus = "SUGGESTED" | "APPROVED" | "REJECTED";
type CourseSource = "MANUAL" | "AI";

type Row = Record<string, unknown> & { id: string };

type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type UpdateManyArgs = {
  where: { id: string; personnelId: string; status: CourseStatus };
  data: Record<string, unknown>;
};
type FindUniqueArgs = { where: { id: string } };

export type CourseRecordsClient = {
  $transaction<T>(fn: (tx: CourseRecordsClient) => Promise<T>): Promise<T>;
  personnelDocument: {
    create(args: CreateArgs): Promise<Row>;
    update(args: UpdateArgs): Promise<Row>;
  };
  personnelCourseRecord: {
    create(args: CreateArgs): Promise<Row>;
    findUnique(args: FindUniqueArgs): Promise<Row | null>;
    update(args: UpdateArgs): Promise<Row>;
    updateMany(args: UpdateManyArgs): Promise<{ count: number }>;
  };
  changeLog: {
    create(args: CreateArgs): Promise<Row>;
  };
  changeLogEntry: {
    createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }>;
  };
};

export type StorePersonnelDocumentInput = {
  personnelId: string;
  fileName: string;
  fileUrl?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedBy: Actor;
  parserStatus?: ParserStatus;
  parserSummary?: string | null;
  suggestions?: Array<Omit<CourseSuggestion, "sourceText"> & { sourceText?: string }>;
};

export type CreateCourseRecordInput = {
  personnelId: string;
  documentId?: string | null;
  actor: Actor;
  source?: CourseSource;
  status?: CourseStatus;
  name: string;
  issuer?: string | null;
  certificateNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  aiConfidence?: number | null;
};

export type CorrectCourseRecordInput = {
  id: string;
  personnelId: string;
  actor: Actor;
  correction: Partial<
    Pick<
      CreateCourseRecordInput,
      "name" | "issuer" | "certificateNumber" | "issueDate" | "expiryDate"
    >
  >;
};

export async function storePersonnelDocument(
  client: CourseRecordsClient,
  input: StorePersonnelDocumentInput
): Promise<{ document: Row; courseRecords: Row[] }> {
  return client.$transaction(async (tx) => {
    const document = await tx.personnelDocument.create({
      data: {
        personnelId: input.personnelId,
        fileName: input.fileName,
        fileUrl: input.fileUrl ?? null,
        mimeType: input.mimeType ?? null,
        sizeBytes: input.sizeBytes ?? null,
        uploadedById: input.uploadedBy.id,
        uploadedByName: input.uploadedBy.name,
        parserStatus: input.parserStatus ?? "NOT_RUN",
        parserSummary: input.parserSummary ?? null,
      },
    });

    const courseRecords: Row[] = [];
    for (const suggestion of input.suggestions ?? []) {
      courseRecords.push(
        await tx.personnelCourseRecord.create({
          data: {
            personnelId: input.personnelId,
            documentId: document.id,
            name: suggestion.name,
            issuer: suggestion.issuer ?? null,
            certificateNumber: suggestion.certificateNumber ?? null,
            issueDate: suggestion.issueDate ?? null,
            expiryDate: suggestion.expiryDate ?? null,
            status: "SUGGESTED",
            source: "AI",
            aiConfidence: suggestion.confidence,
            rejectionReason: null,
            createdById: input.uploadedBy.id,
            createdByName: input.uploadedBy.name,
          },
        })
      );
    }

    await writeChangeLog(tx, {
      actorType: courseRecords.length > 0 ? "AI" : "USER",
      actor: input.uploadedBy,
      source: courseRecords.length > 0 ? "AI_ASSISTANT" : "USER_ACTION",
      summary:
        courseRecords.length > 0
          ? `Lagret dokument med ${courseRecords.length} kursforslag`
          : "Lagret personelldokument uten kursforslag",
      entries: [
        {
          model: "PersonnelDocument",
          recordId: document.id,
          field: "fileName",
          oldValue: null,
          newValue: input.fileName,
        },
        {
          model: "PersonnelDocument",
          recordId: document.id,
          field: "parserStatus",
          oldValue: null,
          newValue: input.parserStatus ?? "NOT_RUN",
        },
        ...courseRecords.map((record) => ({
          model: "PersonnelCourseRecord",
          recordId: record.id,
          field: "status",
          oldValue: null,
          newValue: record.status,
        })),
      ],
    });

    return { document, courseRecords };
  });
}

export async function createCourseRecord(
  client: CourseRecordsClient,
  input: CreateCourseRecordInput
): Promise<Row> {
  assertCourseName(input.name);
  assertOptionalDate(input.issueDate, "issueDate");
  assertOptionalDate(input.expiryDate, "expiryDate");

  return client.$transaction(async (tx) => {
    const source = input.source ?? "MANUAL";
    const status = input.status ?? (source === "MANUAL" ? "APPROVED" : "SUGGESTED");
    const now = new Date();
    const record = await tx.personnelCourseRecord.create({
      data: {
        personnelId: input.personnelId,
        documentId: input.documentId ?? null,
        name: input.name,
        issuer: input.issuer ?? null,
        certificateNumber: input.certificateNumber ?? null,
        issueDate: input.issueDate ?? null,
        expiryDate: input.expiryDate ?? null,
        status,
        source,
        aiConfidence: input.aiConfidence ?? null,
        rejectionReason: null,
        createdById: input.actor.id,
        createdByName: input.actor.name,
        approvedById: status === "APPROVED" ? input.actor.id : null,
        approvedByName: status === "APPROVED" ? input.actor.name : null,
        approvedAt: status === "APPROVED" ? now : null,
      },
    });

    await writeChangeLog(tx, {
      actorType: source === "AI" ? "AI" : "USER",
      actor: input.actor,
      source: source === "AI" ? "AI_ASSISTANT" : "USER_ACTION",
      summary: status === "APPROVED" ? `Opprettet kurs: ${input.name}` : `Foreslo kurs: ${input.name}`,
      entries: [
        {
          model: "PersonnelCourseRecord",
          recordId: record.id,
          field: "status",
          oldValue: null,
          newValue: status,
        },
      ],
    });

    return record;
  });
}

export async function approveCourseRecord(
  client: CourseRecordsClient,
  input: { id: string; personnelId: string; actor: Actor }
): Promise<Row> {
  return client.$transaction(async (tx) => {
    const current = await requireCourseRecord(tx, input.id, input.personnelId);
    assertSuggested(current);
    const now = new Date();
    const updated = await updateSuggestedCourseRecord(tx, {
      id: input.id,
      personnelId: input.personnelId,
      data: {
        status: "APPROVED",
        approvedById: input.actor.id,
        approvedByName: input.actor.name,
        approvedAt: now,
      },
    });

    await writeChangeLog(tx, {
      actorType: "USER",
      actor: input.actor,
      source: "USER_ACTION",
      summary: `Godkjente kurs: ${String(updated.name)}`,
      entries: diffEntries("PersonnelCourseRecord", input.id, current, updated, [
        "status",
        "approvedById",
        "approvedByName",
        "approvedAt",
      ]),
    });

    return updated;
  });
}

export async function correctAndApproveCourseRecord(
  client: CourseRecordsClient,
  input: CorrectCourseRecordInput
): Promise<Row> {
  if (input.correction.name !== undefined) assertCourseName(input.correction.name);
  assertOptionalDate(input.correction.issueDate, "issueDate");
  assertOptionalDate(input.correction.expiryDate, "expiryDate");

  return client.$transaction(async (tx) => {
    const current = await requireCourseRecord(tx, input.id, input.personnelId);
    assertSuggested(current);
    const now = new Date();
    const data: Record<string, unknown> = {
      status: "APPROVED",
      approvedById: input.actor.id,
      approvedByName: input.actor.name,
      approvedAt: now,
    };
    for (const [key, value] of Object.entries(input.correction)) {
      if (value !== undefined) data[key] = value;
    }
    const updated = await updateSuggestedCourseRecord(tx, {
      id: input.id,
      personnelId: input.personnelId,
      data,
    });

    await writeChangeLog(tx, {
      actorType: "USER",
      actor: input.actor,
      source: "USER_ACTION",
      summary: `Korrigerte og godkjente kurs: ${String(updated.name)}`,
      entries: diffEntries("PersonnelCourseRecord", input.id, current, updated, [
        "name",
        "issuer",
        "certificateNumber",
        "issueDate",
        "expiryDate",
        "status",
        "approvedById",
        "approvedByName",
        "approvedAt",
      ]),
    });

    return updated;
  });
}

export async function rejectCourseRecord(
  client: CourseRecordsClient,
  input: { id: string; personnelId: string; actor: Actor; reason: string }
): Promise<Row> {
  const reason = input.reason.trim();
  if (!reason) throw new Error("Avvisning krever begrunnelse");

  return client.$transaction(async (tx) => {
    const current = await requireCourseRecord(tx, input.id, input.personnelId);
    assertSuggested(current);
    const now = new Date();
    const updated = await updateSuggestedCourseRecord(tx, {
      id: input.id,
      personnelId: input.personnelId,
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        rejectedById: input.actor.id,
        rejectedByName: input.actor.name,
        rejectedAt: now,
      },
    });

    await writeChangeLog(tx, {
      actorType: "USER",
      actor: input.actor,
      source: "USER_ACTION",
      summary: `Avviste kursforslag: ${String(updated.name)}`,
      entries: diffEntries("PersonnelCourseRecord", input.id, current, updated, [
        "status",
        "rejectionReason",
        "rejectedById",
        "rejectedByName",
        "rejectedAt",
      ]),
    });

    return updated;
  });
}

async function updateSuggestedCourseRecord(
  client: CourseRecordsClient,
  input: { id: string; personnelId: string; data: Record<string, unknown> }
): Promise<Row> {
  const result = await client.personnelCourseRecord.updateMany({
    where: {
      id: input.id,
      personnelId: input.personnelId,
      status: "SUGGESTED",
    },
    data: input.data,
  });
  if (result.count !== 1) {
    throw new Error("Kunne ikke behandle kursforslag: status er endret");
  }

  const updated = await client.personnelCourseRecord.findUnique({
    where: { id: input.id },
  });
  if (!updated) throw new Error("Kursrad ikke funnet etter oppdatering");
  return updated;
}

async function requireCourseRecord(
  client: CourseRecordsClient,
  id: string,
  personnelId: string
): Promise<Row> {
  const record = await client.personnelCourseRecord.findUnique({ where: { id } });
  if (!record) throw new Error("Kursrad ikke funnet");
  if (record.personnelId !== personnelId) {
    throw new Error("Kursrad tilhorer ikke personell");
  }
  return { ...record };
}

type LogEntry = {
  model: string;
  recordId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

async function writeChangeLog(
  client: CourseRecordsClient,
  input: {
    actorType: "USER" | "AI";
    actor: Actor;
    source: "USER_ACTION" | "AI_ASSISTANT";
    summary: string;
    entries: LogEntry[];
  }
): Promise<void> {
  if (input.entries.length === 0) return;
  const log = await client.changeLog.create({
    data: {
      actorType: input.actorType,
      actorId: input.actor.id,
      actorName: input.actor.name,
      source: input.source,
      summary: input.summary,
    },
  });
  await client.changeLogEntry.createMany({
    data: input.entries.map((entry) => ({
      changeLogId: log.id,
      model: entry.model,
      recordId: entry.recordId,
      field: entry.field,
      oldValue: toAuditValue(entry.oldValue),
      newValue: toAuditValue(entry.newValue),
    })),
  });
}

function diffEntries(
  model: string,
  recordId: string,
  before: Row,
  after: Row,
  fields: string[]
): LogEntry[] {
  return fields
    .filter((field) => !sameValue(before[field], after[field]))
    .map((field) => ({
      model,
      recordId,
      field,
      oldValue: before[field],
      newValue: after[field],
    }));
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  return left === right;
}

function assertSuggested(record: Row): void {
  if (record.status !== "SUGGESTED") {
    throw new Error("Kursforslag kan bare behandles fra SUGGESTED");
  }
}

function assertCourseName(name: string): void {
  if (!name.trim()) {
    throw new Error("Kursnavn er paakrevd");
  }
}

function assertOptionalDate(value: string | null | undefined, field: string): void {
  if (value === null || value === undefined || value === "") return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} maa vaere YYYY-MM-DD`);
  }
}

function toAuditValue(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toAuditValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        toAuditValue(entryValue),
      ])
    );
  }
  return value;
}
