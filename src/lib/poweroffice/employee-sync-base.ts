import {
  diagnoseFields,
  type FieldDiff,
  type SyncDiagnosis,
} from "@/lib/sync/conflict-detector";
import type { POEmployeeResponse } from "./types";

export type PowerOfficeEmployeeLocalShape = {
  firstName: unknown;
  lastName: unknown;
  email: unknown;
  phone: unknown;
  department: unknown;
  jobTitle: unknown;
  isActive: unknown;
};

export type PowerOfficeEmployeeSyncPlan = {
  diagnosis: SyncDiagnosis;
  safeFieldUpdates: Record<string, unknown>;
  nextBaseRawJson: string | null;
};

export type PersonnelStatusValue = "ACTIVE" | "INACTIVE" | "ARCHIVED";

const COMPARED_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "department",
  "jobTitle",
  "isActive",
] as const;

const LOCAL_TO_REMOTE_FIELD = {
  firstName: "firstName",
  lastName: "lastName",
  email: "emailAddress",
  phone: "phoneNumber",
  department: "departmentCode",
  jobTitle: "jobTitle",
  isActive: "isActive",
} as const satisfies Record<(typeof COMPARED_FIELDS)[number], string>;

type PowerOfficeEmployeeRawShape = POEmployeeResponse & Record<string, unknown>;

export function serializePowerOfficeEmployeeBase(
  shape: Record<string, unknown>
): string {
  return JSON.stringify(shape);
}

export function derivePowerOfficePersonnelStatus(
  isActive: boolean | null | undefined,
  currentStatus: PersonnelStatusValue | null | undefined
): PersonnelStatusValue | null {
  if (currentStatus === "ARCHIVED") return null;
  if (isActive === false) return "INACTIVE";
  if (isActive === true && currentStatus === "INACTIVE") return "ACTIVE";
  return null;
}

export function mapPowerOfficeEmployeeToLocalShape(
  po: POEmployeeResponse | Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!po) return null;
  const p = po as POEmployeeResponse & Record<string, unknown>;
  return {
    firstName: p.firstName ?? null,
    lastName: p.lastName ?? null,
    email: p.emailAddress ?? null,
    phone: p.phoneNumber ?? null,
    department: p.departmentCode ?? null,
    jobTitle: p.jobTitle ?? null,
    isActive: p.isActive ?? null,
  };
}

function parsePowerOfficeEmployeeBaseRaw(
  rawJson: string | null | undefined
): PowerOfficeEmployeeRawShape | null {
  if (!rawJson) return null;
  try {
    return JSON.parse(rawJson) as PowerOfficeEmployeeRawShape;
  } catch {
    return null;
  }
}

export function parsePowerOfficeEmployeeBase(
  rawJson: string | null | undefined
): Record<string, unknown> | null {
  return mapPowerOfficeEmployeeToLocalShape(
    parsePowerOfficeEmployeeBaseRaw(rawJson)
  );
}

function safeChangesFromDiagnosis(diagnosis: SyncDiagnosis): FieldDiff[] {
  if (diagnosis.kind === "remote_only") return diagnosis.changes;
  if (diagnosis.kind === "conflict") return diagnosis.safeRemote;
  return [];
}

function buildNextBase(input: {
  diagnosis: SyncDiagnosis;
  remote: POEmployeeResponse;
  baseRaw: PowerOfficeEmployeeRawShape | null;
}): Record<string, unknown> | null {
  const { diagnosis, remote, baseRaw } = input;

  if (diagnosis.kind === "missing_link") return { ...remote };
  if (diagnosis.kind === "no_change") return { ...remote };
  if (diagnosis.kind === "remote_only") return { ...remote };
  if (diagnosis.kind === "local_only") return baseRaw;

  if (!baseRaw) return null;

  const nextBase: Record<string, unknown> = { ...baseRaw };
  for (const change of diagnosis.safeRemote) {
    const remoteField =
      LOCAL_TO_REMOTE_FIELD[change.field as keyof typeof LOCAL_TO_REMOTE_FIELD];
    if (remoteField) {
      nextBase[remoteField] = change.remoteValue;
    }
  }
  return nextBase;
}

export function buildPowerOfficeEmployeeSyncPlan(input: {
  local: PowerOfficeEmployeeLocalShape | null;
  remote: POEmployeeResponse;
  baseRawJson: string | null | undefined;
}): PowerOfficeEmployeeSyncPlan {
  const baseRaw = parsePowerOfficeEmployeeBaseRaw(input.baseRawJson);
  const base = mapPowerOfficeEmployeeToLocalShape(baseRaw);
  const remote = mapPowerOfficeEmployeeToLocalShape(input.remote);

  const diagnosis = diagnoseFields({
    local: input.local,
    remote,
    base,
    fields: [...COMPARED_FIELDS],
  });

  const safeFieldUpdates: Record<string, unknown> = {};
  for (const change of safeChangesFromDiagnosis(diagnosis)) {
    safeFieldUpdates[change.field] = change.remoteValue;
  }

  const nextBase = buildNextBase({
    diagnosis,
    remote: input.remote,
    baseRaw,
  });

  return {
    diagnosis,
    safeFieldUpdates,
    nextBaseRawJson: nextBase
      ? serializePowerOfficeEmployeeBase(nextBase)
      : null,
  };
}
