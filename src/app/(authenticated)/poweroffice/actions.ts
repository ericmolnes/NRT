"use server";

import { auth } from "@/lib/auth";
import { isAdmin, assertAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { runSync, type SyncResourceType } from "@/lib/poweroffice/sync-all";
import type { SyncResult } from "@/lib/sync/sync-queue";
import { emptySyncResult, mergeSyncResults } from "@/lib/sync/sync-queue";
import {
  countFailedRecords,
  countMissingRemoteRecords,
  summarizeSyncRunMessage,
} from "@/lib/sync/sync-run-status";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  /**
   * Aggregert konfliktresultat fra sync-runden. Brukes av sync-knappen
   * til å vise hvor mye som ble applyet, hvor mange konflikter osv.
   */
  conflicts?: SyncResult;
};

export async function triggerSync(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "Ikke autentisert" };
  }

  const admin = await isAdmin();
  if (!admin) {
    return { message: "Kun administratorer kan starte synkronisering" };
  }

  const resource = (formData.get("resource") as SyncResourceType) ?? "all";

  try {
    const result = await runSync(resource, session.user.id);
    revalidatePath("/poweroffice");

    // Plukk ut alle conflict-objekter fra delsync-resultater og slå sammen.
    // `runSync` returnerer enten ett resultat (per ressurs) eller et map
    // (resource: "all"). Vi flatener begge tilfeller før summering.
    const conflictResults: SyncResult[] = [];
    for (const value of Object.values(result)) {
      if (
        value &&
        typeof value === "object" &&
        "conflicts" in value &&
        value.conflicts &&
        typeof value.conflicts === "object"
      ) {
        conflictResults.push(value.conflicts as SyncResult);
      }
    }
    const conflicts = mergeSyncResults(
      conflictResults.length > 0 ? conflictResults : [emptySyncResult()]
    );

    return {
      message: summarizeResult(conflicts, {
        failedRecords: countFailedRecords(result),
        missingRemoteRecords: countMissingRemoteRecords(result),
      }),
      conflicts,
    };
  } catch (error) {
    return {
      message: `Synkronisering feilet: ${error instanceof Error ? error.message : "Ukjent feil"}`,
    };
  }
}

function summarizeResult(
  r: SyncResult,
  options: {
    failedRecords?: number;
    missingRemoteRecords?: number;
    errorCount?: number;
  } = {}
): string {
  return summarizeSyncRunMessage({
    conflicts: r,
    failedRecords: options.failedRecords,
    missingRemoteRecords: options.missingRemoteRecords,
    errorCount: options.errorCount,
  });
}

export async function linkEmployeeToPersonnel(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { message: "Ikke autentisert" };
  }

  await assertAdmin();

  const poEmployeeId = formData.get("poEmployeeId") as string;
  const personnelId = formData.get("personnelId") as string;

  if (!poEmployeeId || !personnelId) {
    return { errors: { poEmployeeId: ["Velg en ansatt og personell-oppføring"] } };
  }

  try {
    await db.pOEmployee.update({
      where: { id: poEmployeeId },
      data: { personnelId },
    });

    revalidatePath("/poweroffice/ansatte");
    return { message: "Kobling opprettet" };
  } catch {
    return { message: "Kunne ikke opprette kobling" };
  }
}

export async function unlinkEmployee(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { message: "Ikke autentisert" };
  }

  await assertAdmin();

  const poEmployeeId = formData.get("poEmployeeId") as string;

  try {
    await db.pOEmployee.update({
      where: { id: poEmployeeId },
      data: { personnelId: null },
    });

    revalidatePath("/poweroffice/ansatte");
    return { message: "Kobling fjernet" };
  } catch {
    return { message: "Kunne ikke fjerne kobling" };
  }
}
