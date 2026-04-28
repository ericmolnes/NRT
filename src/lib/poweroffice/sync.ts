import { db } from "@/lib/db";
import type { SyncResult } from "@/lib/sync/sync-queue";
import { emptySyncResult } from "@/lib/sync/sync-queue";

export interface SyncOptions<TPO> {
  resourceType: string;
  fetchAll: () => Promise<TPO[]>;
  upsertItem: (item: TPO) => Promise<void>;
  userId: string;
}

/**
 * Standard returtype for PowerOffice-sync. `conflicts` populeres av
 * sync-funksjoner som har integrert konfliktdetektor (i første omgang
 * `syncEmployees`); andre funksjoner returnerer fortsatt et tomt
 * SyncResult slik at samlebåndet i `runSync` kan aggregere uniformt.
 */
export type SyncSummary = {
  syncLogId: string;
  total: number;
  synced: number;
  failed: number;
  conflicts: SyncResult;
};

export function emptyConflictSummary(): SyncResult {
  return emptySyncResult();
}

export async function syncResource<TPO>(options: SyncOptions<TPO>) {
  const { resourceType, fetchAll, upsertItem, userId } = options;

  const syncLog = await db.pOSyncLog.create({
    data: {
      resourceType,
      direction: "pull",
      status: "running",
      triggeredBy: userId,
    },
  });

  let synced = 0;
  let failed = 0;
  let total = 0;

  try {
    const items = await fetchAll();
    total = items.length;

    await db.pOSyncLog.update({
      where: { id: syncLog.id },
      data: { recordsTotal: total },
    });

    for (const item of items) {
      try {
        await upsertItem(item);
        synced++;
      } catch (err) {
        failed++;
        console.error(
          `[PowerOffice Sync] Feil ved upsert av ${resourceType}:`,
          err
        );
      }
    }

    await db.pOSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        recordsSynced: synced,
        recordsFailed: failed,
        completedAt: new Date(),
      },
    });

    return { syncLogId: syncLog.id, total, synced, failed };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Ukjent feil";

    await db.pOSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        recordsSynced: synced,
        recordsFailed: failed,
        errorMessage,
        completedAt: new Date(),
      },
    });

    throw err;
  }
}
