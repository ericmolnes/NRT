import type { SyncResult } from "./sync-queue";

export type SyncLogStatus = "completed" | "partial";

export function getSyncLogStatus(failed: number | null | undefined): SyncLogStatus {
  return (failed ?? 0) > 0 ? "partial" : "completed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function countFailedRecords(value: unknown): number {
  if (!isRecord(value) && !Array.isArray(value)) return 0;

  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countFailedRecords(item), 0);
  }

  let count = 0;
  for (const [key, child] of Object.entries(value)) {
    if ((key === "failed" || key === "recordsFailed") && typeof child === "number") {
      count += child;
      continue;
    }
    count += countFailedRecords(child);
  }
  return count;
}

export function countMissingRemoteRecords(value: unknown): number {
  if (!isRecord(value) && !Array.isArray(value)) return 0;

  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countMissingRemoteRecords(item), 0);
  }

  let count = 0;
  for (const [key, child] of Object.entries(value)) {
    if (
      (key === "missingRemote" || key === "missingRemoteRecords") &&
      typeof child === "number"
    ) {
      count += child;
      continue;
    }
    count += countMissingRemoteRecords(child);
  }
  return count;
}

export function countSyncAttentionItems(value: unknown): number {
  if (!isRecord(value) && !Array.isArray(value)) return 0;

  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countSyncAttentionItems(item), 0);
  }

  let count = 0;
  for (const [key, child] of Object.entries(value)) {
    if (
      (key === "conflicts" || key === "missingLink") &&
      typeof child === "number"
    ) {
      count += child;
      continue;
    }
    count += countSyncAttentionItems(child);
  }
  return count;
}

export function countSyncRunErrors(value: unknown): number {
  if (!isRecord(value) && !Array.isArray(value)) return 0;

  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countSyncRunErrors(item), 0);
  }

  let count = 0;
  for (const [key, child] of Object.entries(value)) {
    if (key === "errors" && Array.isArray(child)) {
      count += child.length;
      continue;
    }
    if (key === "error" && typeof child === "string" && child.trim()) {
      count += 1;
      continue;
    }
    count += countSyncRunErrors(child);
  }
  return count;
}

export function hasSyncRunFailures(value: unknown): boolean {
  return (
    countFailedRecords(value) > 0 ||
    countMissingRemoteRecords(value) > 0 ||
    countSyncAttentionItems(value) > 0 ||
    countSyncRunErrors(value) > 0
  );
}

export function summarizeSyncRunMessage(input: {
  conflicts: SyncResult;
  failedRecords?: number;
  missingRemoteRecords?: number;
  errorCount?: number;
}): string {
  const { conflicts } = input;
  const failedRecords = input.failedRecords ?? 0;
  const missingRemoteRecords = input.missingRemoteRecords ?? 0;
  const errorCount = input.errorCount ?? 0;

  if (
    conflicts.applied === 0 &&
    conflicts.conflicts === 0 &&
    conflicts.pendingPush === 0 &&
    conflicts.missingLink === 0 &&
    failedRecords === 0 &&
    missingRemoteRecords === 0 &&
    errorCount === 0
  ) {
    return "Synkronisering fullført - ingen endringer";
  }

  const parts: string[] = [];
  if (conflicts.applied) parts.push(`${conflicts.applied} oppdatert`);
  if (conflicts.conflicts) {
    parts.push(
      `${conflicts.conflicts} konflikt${conflicts.conflicts === 1 ? "" : "er"}`
    );
  }
  if (conflicts.pendingPush) {
    parts.push(`${conflicts.pendingPush} venter på push`);
  }
  if (conflicts.missingLink) {
    parts.push(`${conflicts.missingLink} mangler kobling`);
  }
  if (failedRecords) {
    parts.push(`${failedRecords} radfeil`);
  }
  if (missingRemoteRecords) {
    parts.push(`${missingRemoteRecords} mangler hos kilde`);
  }
  if (errorCount) {
    parts.push(`${errorCount} delsync feilet`);
  }

  const hasFailure =
    failedRecords > 0 || missingRemoteRecords > 0 || errorCount > 0;
  return `${hasFailure ? "Synket med avvik" : "Synket"}. ${parts.join(", ")}.`;
}
