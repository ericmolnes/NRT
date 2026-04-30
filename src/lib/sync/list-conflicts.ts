import type { SyncSource } from "./sync-queue";

export type SyncConflictListFilters = {
  source?: SyncSource;
  model?: string;
};

export type SyncConflictListRow = {
  id: string;
  source: SyncSource;
  model: string;
  recordId: string | null;
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  detectedAt: Date;
  status: "UNRESOLVED" | "RESOLVED" | "IGNORED";
  resolution: "KEEP_LOCAL" | "KEEP_REMOTE" | "MERGED" | "MANUAL" | null;
  resolvedAt: Date | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  notes: string | null;
  changeLogId: string | null;
};

export interface SyncConflictListClient {
  syncConflict: {
    findMany(args: {
      where: {
        status: "UNRESOLVED";
        source?: SyncSource;
        model?: string;
      };
      orderBy: { detectedAt: "desc" };
    }): Promise<SyncConflictListRow[]>;
  };
}

export async function listUnresolvedSyncConflicts(
  client: SyncConflictListClient,
  filters: SyncConflictListFilters = {}
): Promise<SyncConflictListRow[]> {
  return client.syncConflict.findMany({
    where: {
      status: "UNRESOLVED",
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.model ? { model: filters.model } : {}),
    },
    orderBy: { detectedAt: "desc" },
  });
}
