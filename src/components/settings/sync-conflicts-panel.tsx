import { AlertTriangle, Ban, CheckCircle2, CloudDownload } from "lucide-react";

import {
  ignoreSyncConflict,
  resolveSyncConflict,
} from "@/app/(authenticated)/settings/sync-conflicts/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  listUnresolvedSyncConflicts,
  type SyncConflictListClient,
} from "@/lib/sync/list-conflicts";

function formatJsonValue(value: unknown) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function sourceLabel(source: "RECMAN" | "POWEROFFICE") {
  return source === "RECMAN" ? "RecMan" : "PowerOffice";
}

export async function SyncConflictsPanel() {
  const conflicts = await listUnresolvedSyncConflicts(
    db as unknown as SyncConflictListClient
  );

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          Ingen uavklarte sync-konflikter.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {conflicts.map((conflict) => (
            <li key={conflict.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <p className="truncate text-sm font-medium">
                      {conflict.model}.{conflict.field}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {sourceLabel(conflict.source)}
                    </Badge>
                    {conflict.recordId && (
                      <Badge variant="outline" className="text-[10px]">
                        {conflict.recordId}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(conflict.detectedAt).toLocaleString("nb-NO")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                    Lokal
                  </p>
                  <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words text-xs">
                    {formatJsonValue(conflict.localValue)}
                  </pre>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                    Remote
                  </p>
                  <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words text-xs">
                    {formatJsonValue(conflict.remoteValue)}
                  </pre>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <form
                  action={async () => {
                    "use server";
                    await resolveSyncConflict(conflict.id, "KEEP_LOCAL");
                  }}
                >
                  <Button type="submit" size="sm" variant="secondary">
                    <CheckCircle2 className="h-3 w-3" />
                    Lokal
                  </Button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await resolveSyncConflict(conflict.id, "KEEP_REMOTE");
                  }}
                >
                  <Button type="submit" size="sm" variant="default">
                    <CloudDownload className="h-3 w-3" />
                    Remote
                  </Button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await ignoreSyncConflict(conflict.id);
                  }}
                >
                  <Button type="submit" size="sm" variant="outline">
                    <Ban className="h-3 w-3" />
                    Ignorer
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
