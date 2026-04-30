"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/rbac";
import { Prisma } from "@/generated/prisma/client";

type SyncResolutionChoice = "KEEP_LOCAL" | "KEEP_REMOTE";

type RemoteConflict = {
  model: string;
  recordId: string | null;
  field: string;
  remoteValue: unknown;
};

const PO_EMPLOYEE_REMOTE_FIELDS = new Set([
  "firstName",
  "lastName",
  "email",
  "phone",
  "department",
  "jobTitle",
  "isActive",
]);

const RECMAN_CANDIDATE_REMOTE_FIELDS = new Set([
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

const RECMAN_DATE_FIELDS = new Set([
  "dob",
  "employeeStart",
  "employeeEnd",
  "recmanCreated",
  "recmanUpdated",
]);

function assertSyncResolution(
  resolution: unknown
): asserts resolution is SyncResolutionChoice {
  if (resolution !== "KEEP_LOCAL" && resolution !== "KEEP_REMOTE") {
    throw new Error("Ugyldig konfliktlosning");
  }
}

function coerceRecmanRemoteValue(field: string, value: unknown) {
  if (!RECMAN_DATE_FIELDS.has(field) || value === null) return value;
  if (value instanceof Date) return value;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`Ugyldig datoverdi for Recman-feltet ${field}`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Ugyldig datoverdi for Recman-feltet ${field}`);
  }
  return date;
}

async function applyRemoteConflictValue(
  tx: Prisma.TransactionClient,
  conflict: RemoteConflict
) {
  if (!conflict.recordId) {
    throw new Error("Konflikten mangler recordId og kan ikke loses automatisk");
  }

  if (conflict.model === "POEmployee") {
    if (!PO_EMPLOYEE_REMOTE_FIELDS.has(conflict.field)) {
      throw new Error(`Unsupported POEmployee conflict field: ${conflict.field}`);
    }

    await tx.pOEmployee.update({
      where: { id: conflict.recordId },
      data: {
        [conflict.field]: conflict.remoteValue,
      } as Prisma.POEmployeeUpdateInput,
    });
    return;
  }

  if (conflict.model === "RecmanCandidate") {
    if (!RECMAN_CANDIDATE_REMOTE_FIELDS.has(conflict.field)) {
      throw new Error(
        `Unsupported RecmanCandidate conflict field: ${conflict.field}`
      );
    }

    await tx.recmanCandidate.update({
      where: { id: conflict.recordId },
      data: {
        [conflict.field]: coerceRecmanRemoteValue(
          conflict.field,
          conflict.remoteValue
        ),
      } as Prisma.RecmanCandidateUpdateInput,
    });
    return;
  }

  throw new Error(`Unsupported sync conflict model: ${conflict.model}`);
}

export async function resolveSyncConflict(
  conflictId: string,
  resolution: unknown
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");
  await assertAdmin();
  assertSyncResolution(resolution);

  const actorId = session.user.id;
  const actorName = session.user.name ?? null;
  const resolvedAt = new Date();

  await db.$transaction(async (tx) => {
    const conflict = await tx.syncConflict.findUnique({
      where: { id: conflictId },
      select: {
        id: true,
        source: true,
        model: true,
        recordId: true,
        field: true,
        localValue: true,
        remoteValue: true,
        status: true,
      },
    });

    if (!conflict) throw new Error("Konflikten finnes ikke");
    if (conflict.status !== "UNRESOLVED") {
      throw new Error("Konflikten er allerede behandlet");
    }

    const selectedValue =
      resolution === "KEEP_REMOTE" ? conflict.remoteValue : conflict.localValue;
    const oldValue =
      resolution === "KEEP_REMOTE" ? conflict.localValue : conflict.remoteValue;
    const sourceName =
      conflict.source === "RECMAN" ? "RecMan" : "PowerOffice";
    const choice =
      resolution === "KEEP_REMOTE" ? "remote-verdi" : "lokal verdi";

    if (resolution === "KEEP_REMOTE") {
      await applyRemoteConflictValue(tx, conflict);
    }

    const log = await tx.changeLog.create({
      data: {
        actorType: "USER",
        actorId,
        actorName,
        source: "USER_ACTION",
        summary: `Loste sync-konflikt for ${conflict.model}.${conflict.field}: beholdt ${choice} fra ${sourceName}`,
      },
      select: { id: true },
    });

    await tx.changeLogEntry.create({
      data: {
        changeLogId: log.id,
        model: conflict.model,
        recordId: conflict.recordId ?? conflict.id,
        field: conflict.field,
        oldValue: oldValue ?? Prisma.JsonNull,
        newValue: selectedValue ?? Prisma.JsonNull,
      },
    });

    const transition = await tx.syncConflict.updateMany({
      where: { id: conflict.id, status: "UNRESOLVED" },
      data: {
        status: "RESOLVED",
        resolution,
        resolvedAt,
        resolvedById: actorId,
        resolvedByName: actorName,
        notes: `Valgte ${choice}.`,
        changeLogId: log.id,
      },
    });

    if (transition.count !== 1) {
      throw new Error("Konflikten er allerede behandlet");
    }
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function ignoreSyncConflict(conflictId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");
  await assertAdmin();

  const actorId = session.user.id;
  const actorName = session.user.name ?? null;
  const resolvedAt = new Date();

  await db.$transaction(async (tx) => {
    const conflict = await tx.syncConflict.findUnique({
      where: { id: conflictId },
      select: {
        id: true,
        source: true,
        model: true,
        recordId: true,
        field: true,
        status: true,
      },
    });

    if (!conflict) throw new Error("Konflikten finnes ikke");
    if (conflict.status !== "UNRESOLVED") {
      throw new Error("Konflikten er allerede behandlet");
    }

    const sourceName =
      conflict.source === "RECMAN" ? "RecMan" : "PowerOffice";
    const log = await tx.changeLog.create({
      data: {
        actorType: "USER",
        actorId,
        actorName,
        source: "USER_ACTION",
        summary: `Ignorerte sync-konflikt for ${conflict.model}.${conflict.field} fra ${sourceName}`,
      },
      select: { id: true },
    });

    await tx.changeLogEntry.create({
      data: {
        changeLogId: log.id,
        model: "SyncConflict",
        recordId: conflict.id,
        field: "status",
        oldValue: "UNRESOLVED",
        newValue: "IGNORED",
      },
    });

    const transition = await tx.syncConflict.updateMany({
      where: { id: conflict.id, status: "UNRESOLVED" },
      data: {
        status: "IGNORED",
        resolution: "MANUAL",
        resolvedAt,
        resolvedById: actorId,
        resolvedByName: actorName,
        notes: "Ignorert av admin.",
        changeLogId: log.id,
      },
    });

    if (transition.count !== 1) {
      throw new Error("Konflikten er allerede behandlet");
    }
  });

  revalidatePath("/settings");
  return { ok: true };
}
