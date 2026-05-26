import {
  diagnoseFields,
  type FieldDiff,
  type SyncDiagnosis,
} from "@/lib/sync/conflict-detector";

export type RecmanCandidateSyncShape = Record<string, unknown>;

export type RecmanCandidateSyncPlan = {
  diagnosis: SyncDiagnosis;
  safeFieldUpdates: RecmanCandidateSyncShape;
  nextBaseRawJson: string | null;
};

export type RecmanCandidateEmployeeState = {
  hasEmployee: boolean;
  targetStatus: "ACTIVE" | "INACTIVE" | null;
};

export type PreviousRecmanCandidateEmployeeState = {
  wasEmployee?: boolean | null;
};

const DATE_FIELDS = new Set([
  "dob",
  "employeeStart",
  "employeeEnd",
  "recmanCreated",
  "recmanUpdated",
]);

const RECMAN_AUTHORITATIVE_FIELDS = new Set([
  "isEmployee",
  "employeeNumber",
  "employeeStart",
  "employeeEnd",
]);

export function serializeRecmanCandidateBase(
  shape: RecmanCandidateSyncShape
): string {
  return JSON.stringify(shape);
}

export function parseRecmanCandidateBase(
  rawJson: string | null | undefined
): RecmanCandidateSyncShape | null {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson) as RecmanCandidateSyncShape;
    for (const field of DATE_FIELDS) {
      const value = parsed[field];
      if (typeof value === "string" && value.length > 0) {
        parsed[field] = new Date(value);
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function collectFields(
  local: RecmanCandidateSyncShape | null,
  remote: RecmanCandidateSyncShape,
  base: RecmanCandidateSyncShape | null
): string[] {
  return Array.from(
    new Set([
      ...Object.keys(remote),
      ...Object.keys(local ?? {}),
      ...Object.keys(base ?? {}),
    ])
  );
}

function safeChangesFromDiagnosis(diagnosis: SyncDiagnosis): FieldDiff[] {
  if (diagnosis.kind === "remote_only") return diagnosis.changes;
  if (diagnosis.kind === "conflict") return diagnosis.safeRemote;
  return [];
}

function promoteRecmanAuthoritativeFields(
  diagnosis: SyncDiagnosis
): SyncDiagnosis {
  if (diagnosis.kind !== "conflict") return diagnosis;

  const authoritative: FieldDiff[] = [];
  const conflicts: FieldDiff[] = [];

  for (const change of diagnosis.conflicts) {
    if (RECMAN_AUTHORITATIVE_FIELDS.has(change.field)) {
      authoritative.push(change);
    } else {
      conflicts.push(change);
    }
  }

  if (authoritative.length === 0) return diagnosis;

  const safeRemote = [...diagnosis.safeRemote, ...authoritative];
  if (conflicts.length === 0) {
    return { kind: "remote_only", changes: safeRemote };
  }

  return { kind: "conflict", conflicts, safeRemote };
}

function buildNextBase(
  diagnosis: SyncDiagnosis,
  remote: RecmanCandidateSyncShape,
  base: RecmanCandidateSyncShape | null
): RecmanCandidateSyncShape | null {
  if (diagnosis.kind === "missing_link") return remote;
  if (diagnosis.kind === "no_change") return remote;
  if (diagnosis.kind === "remote_only") return remote;
  if (diagnosis.kind === "local_only") return base;

  if (!base) return null;

  const nextBase = { ...base };
  for (const change of diagnosis.safeRemote) {
    nextBase[change.field] = change.remoteValue;
  }
  return nextBase;
}

export function buildRecmanCandidateSyncPlan(input: {
  local: RecmanCandidateSyncShape | null;
  remote: RecmanCandidateSyncShape;
  baseRawJson: string | null | undefined;
}): RecmanCandidateSyncPlan {
  const base = parseRecmanCandidateBase(input.baseRawJson);
  const fields = collectFields(input.local, input.remote, base);
  const diagnosis = promoteRecmanAuthoritativeFields(
    diagnoseFields({
      local: input.local,
      remote: input.remote,
      base,
      fields,
    })
  );

  const safeFieldUpdates: RecmanCandidateSyncShape = {};
  for (const change of safeChangesFromDiagnosis(diagnosis)) {
    safeFieldUpdates[change.field] = change.remoteValue;
  }

  const nextBase = buildNextBase(diagnosis, input.remote, base);

  return {
    diagnosis,
    safeFieldUpdates,
    nextBaseRawJson: nextBase ? serializeRecmanCandidateBase(nextBase) : null,
  };
}

export function deriveRecmanCandidateEmployeeState(
  shape: RecmanCandidateSyncShape,
  previous?: PreviousRecmanCandidateEmployeeState
): RecmanCandidateEmployeeState {
  const hasEmployee = shape.isEmployee === true;
  if (!hasEmployee) {
    if (previous?.wasEmployee) {
      return { hasEmployee: false, targetStatus: "INACTIVE" };
    }
    return { hasEmployee: false, targetStatus: null };
  }

  return {
    hasEmployee: true,
    targetStatus: shape.employeeEnd ? "INACTIVE" : "ACTIVE",
  };
}
