const PO_EMPLOYEE_FIELD_TO_RAW_KEY: Record<string, string> = {
  firstName: "firstName",
  lastName: "lastName",
  email: "emailAddress",
  phone: "phoneNumber",
  department: "departmentCode",
  jobTitle: "jobTitle",
  isActive: "isActive",
};

const RECMAN_CANDIDATE_RAW_FIELDS = new Set([
  "corporationId",
  "firstName",
  "lastName",
  "email",
  "phone",
  "mobilePhone",
  "address",
  "postalCode",
  "postalPlace",
  "city",
  "country",
  "nationality",
  "gender",
  "dob",
  "title",
  "description",
  "rating",
  "imageUrl",
  "linkedIn",
  "isEmployee",
  "employeeNumber",
  "employeeStart",
  "employeeEnd",
  "skills",
  "education",
  "experience",
  "projectExperience",
  "courses",
  "relatives",
  "attributes",
  "languages",
  "driversLicense",
  "references",
  "files",
  "recmanCreated",
  "recmanUpdated",
]);

function rawBaseKeyForConflict(model: string, field: string): string | null {
  if (model === "POEmployee") {
    return PO_EMPLOYEE_FIELD_TO_RAW_KEY[field] ?? null;
  }

  if (model === "RecmanCandidate") {
    return RECMAN_CANDIDATE_RAW_FIELDS.has(field) ? field : null;
  }

  return null;
}

function parseRawBase(rawJson: string | null | undefined) {
  if (!rawJson) return {};

  try {
    const parsed = JSON.parse(rawJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function buildAcknowledgedConflictBaseRawJson(input: {
  model: string;
  field: string;
  remoteValue: unknown;
  rawJson: string | null | undefined;
}): string | null {
  const rawKey = rawBaseKeyForConflict(input.model, input.field);
  if (!rawKey) return null;

  const base = parseRawBase(input.rawJson);
  if (!base) return null;

  return JSON.stringify({
    ...base,
    [rawKey]: input.remoteValue ?? null,
  });
}

type RawJsonModelClient = {
  findUnique(args: {
    where: { id: string };
    select: { rawJson: true };
  }): Promise<{ rawJson: string | null } | null>;
  update(args: {
    where: { id: string };
    data: { rawJson: string };
  }): Promise<unknown>;
};

export type ConflictRemoteBaseTransaction = {
  pOEmployee?: RawJsonModelClient;
  recmanCandidate?: RawJsonModelClient;
};

export type ConflictRemoteBaseInput = {
  model: string;
  recordId: string | null;
  field: string;
  remoteValue: unknown;
};

export async function acknowledgeConflictRemoteBase(
  tx: ConflictRemoteBaseTransaction,
  conflict: ConflictRemoteBaseInput
) {
  if (!conflict.recordId) return;

  const client =
    conflict.model === "POEmployee"
      ? tx.pOEmployee
      : conflict.model === "RecmanCandidate"
        ? tx.recmanCandidate
        : null;
  if (!client) return;

  const row = await client.findUnique({
    where: { id: conflict.recordId },
    select: { rawJson: true },
  });
  if (!row) return;

  const rawJson = buildAcknowledgedConflictBaseRawJson({
    model: conflict.model,
    field: conflict.field,
    remoteValue: conflict.remoteValue,
    rawJson: row.rawJson,
  });
  if (!rawJson) return;

  await client.update({
    where: { id: conflict.recordId },
    data: { rawJson },
  });
}
