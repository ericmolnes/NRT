"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CloudAlert,
  CloudDownload,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SyncConflictListRow } from "@/lib/sync/list-conflicts";

export type AssistantSyncConflict = Pick<
  SyncConflictListRow,
  | "id"
  | "source"
  | "model"
  | "recordId"
  | "field"
  | "localValue"
  | "remoteValue"
  | "detectedAt"
>;

export type SyncReviewAction =
  | {
      kind: "resolve";
      conflictId: string;
      resolution: "KEEP_LOCAL" | "KEEP_REMOTE";
    }
  | { kind: "ignore"; conflictId: string };

export type SyncConflictGroup = {
  key: string;
  source: AssistantSyncConflict["source"];
  model: string;
  recordId: string | null;
  conflicts: AssistantSyncConflict[];
};

function groupKey(conflict: AssistantSyncConflict) {
  return `${conflict.source}:${conflict.model}:${conflict.recordId ?? "null"}`;
}

export function groupSyncConflicts(
  conflicts: AssistantSyncConflict[]
): SyncConflictGroup[] {
  const groups = new Map<string, SyncConflictGroup>();

  for (const conflict of conflicts) {
    const key = groupKey(conflict);
    const existing = groups.get(key);
    if (existing) {
      existing.conflicts.push(conflict);
      continue;
    }

    groups.set(key, {
      key,
      source: conflict.source,
      model: conflict.model,
      recordId: conflict.recordId,
      conflicts: [conflict],
    });
  }

  return Array.from(groups.values());
}

export function describeSyncReviewAction(action: SyncReviewAction) {
  if (action.kind === "ignore") {
    return `Ignorer konflikt ${action.conflictId}`;
  }

  const label =
    action.resolution === "KEEP_REMOTE" ? "remote-verdi" : "lokal verdi";
  return `Behold ${label} for konflikt ${action.conflictId}`;
}

export function assertSyncReviewMutationResult(
  result: { ok: boolean } | undefined,
  actionDescription: string
): asserts result is { ok: true } {
  if (!result) {
    throw new Error(`${actionDescription} returnerte ikke en gyldig status.`);
  }

  if (result.ok !== true) {
    throw new Error(`${actionDescription} mislyktes.`);
  }
}

function sourceLabel(source: AssistantSyncConflict["source"]) {
  return source === "RECMAN" ? "RecMan" : "PowerOffice";
}

function formatJsonValue(value: unknown) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function dateLabel(value: Date | string) {
  return new Date(value).toLocaleString("nb-NO");
}

export function SyncReviewPanel({
  conflicts,
  canManage,
  resolveAction,
  ignoreAction,
}: {
  conflicts: AssistantSyncConflict[];
  canManage: boolean;
  resolveAction: (
    conflictId: string,
    resolution: "KEEP_LOCAL" | "KEEP_REMOTE"
  ) => Promise<{ ok: boolean } | undefined>;
  ignoreAction: (conflictId: string) => Promise<{ ok: boolean } | undefined>;
}) {
  const router = useRouter();
  const [stagedAction, setStagedAction] = useState<SyncReviewAction | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const groups = useMemo(() => groupSyncConflicts(conflicts), [conflicts]);

  function confirmStagedAction() {
    if (!stagedAction) return;

    startTransition(async () => {
      try {
        setError(null);
        const actionDescription = describeSyncReviewAction(stagedAction);
        let result: { ok: boolean } | undefined;

        if (stagedAction.kind === "ignore") {
          result = await ignoreAction(stagedAction.conflictId);
        } else {
          result = await resolveAction(
            stagedAction.conflictId,
            stagedAction.resolution
          );
        }
        assertSyncReviewMutationResult(result, actionDescription);
        setStagedAction(null);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    });
  }

  return (
    <Card size="sm">
      <CardHeader className="border-b pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CloudAlert className="h-4 w-4 text-amber-600" />
            Sync review
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{conflicts.length} uavklart</Badge>
            {!canManage && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Admin
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {conflicts.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">
            Ingen uavklarte sync-konflikter.
          </div>
        ) : (
          <div className="divide-y">
            {groups.map((group) => (
              <section key={group.key} className="space-y-3 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <h3 className="truncate text-sm font-medium">
                        {group.model}
                      </h3>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {sourceLabel(group.source)}
                      </Badge>
                      <Badge variant="outline" className="max-w-full text-[10px]">
                        <span className="truncate">
                          {group.recordId ?? "uten recordId"}
                        </span>
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit text-[10px]">
                    {group.conflicts.length} felt
                  </Badge>
                </div>

                <div className="space-y-2">
                  {group.conflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      className="rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {conflict.field}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {dateLabel(conflict.detectedAt)}
                          </p>
                        </div>
                        {canManage && (
                          <div className="grid grid-cols-3 gap-1 sm:flex">
                            <Button
                              type="button"
                              size="xs"
                              variant="secondary"
                              onClick={() =>
                                setStagedAction({
                                  kind: "resolve",
                                  conflictId: conflict.id,
                                  resolution: "KEEP_LOCAL",
                                })
                              }
                              disabled={isPending}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Lokal
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              onClick={() =>
                                setStagedAction({
                                  kind: "resolve",
                                  conflictId: conflict.id,
                                  resolution: "KEEP_REMOTE",
                                })
                              }
                              disabled={isPending}
                            >
                              <CloudDownload className="h-3 w-3" />
                              Remote
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                setStagedAction({
                                  kind: "ignore",
                                  conflictId: conflict.id,
                                })
                              }
                              disabled={isPending}
                            >
                              <Ban className="h-3 w-3" />
                              Ignorer
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <div className="min-w-0 rounded-md border bg-background p-2">
                          <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                            Lokal
                          </p>
                          <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words text-xs">
                            {formatJsonValue(conflict.localValue)}
                          </pre>
                        </div>
                        <div className="min-w-0 rounded-md border bg-background p-2">
                          <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                            Remote
                          </p>
                          <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words text-xs">
                            {formatJsonValue(conflict.remoteValue)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {stagedAction && (
          <div className="border-t bg-muted/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium">
                  {describeSyncReviewAction(stagedAction)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Krever eksplisitt bekreftelse.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setStagedAction(null)}
                  disabled={isPending}
                >
                  <X className="h-3.5 w-3.5" />
                  Avbryt
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={confirmStagedAction}
                  disabled={isPending}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Bekreft
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="border-t p-4 text-xs text-destructive">{error}</div>
        )}
      </CardContent>
    </Card>
  );
}
