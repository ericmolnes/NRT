import { Bot, CloudAlert } from "lucide-react";

import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { SyncReviewPanel } from "@/components/assistant/sync-review-panel";
import {
  ignoreSyncConflict,
  resolveSyncConflict,
} from "@/app/(authenticated)/settings/sync-conflicts/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { resolveAccessForUser } from "@/lib/access/get-current-access";
import { resolveUserCapabilities } from "@/lib/assistant/resolve-user-capabilities";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listUnresolvedSyncConflicts,
  type SyncConflictListClient,
} from "@/lib/sync/list-conflicts";

export default async function AssistantPage() {
  const session = await auth();
  const access = await resolveAccessForUser(session?.user ?? null);
  const capabilities = resolveUserCapabilities(access.level);
  const canReviewSyncConflicts = capabilities.allowedActionIds.some(
    (actionId) =>
      actionId === "syncConflict.resolve" || actionId === "syncConflict.ignore"
  );
  const conflicts = canReviewSyncConflicts
    ? await listUnresolvedSyncConflicts(db as unknown as SyncConflictListClient)
    : [];

  if (!capabilities.canUseAssistant || access.level === "MINIMUM") {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Assistent</h1>
        </div>
        <Card size="sm">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Ingen assistenttilgang.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-nrt-teal" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Assistent
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{access.level}</Badge>
            <Badge variant="outline">
              {capabilities.allowedActionIds.length} handlinger
            </Badge>
          </div>
        </div>
      </div>

      <AssistantPanel
        accessLevel={access.level}
        capabilities={capabilities}
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CloudAlert className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold">Sync-konflikter</h2>
        </div>
        <SyncReviewPanel
          conflicts={conflicts}
          canManage={canReviewSyncConflicts}
          resolveAction={resolveSyncConflict}
          ignoreAction={ignoreSyncConflict}
        />
      </section>
    </div>
  );
}
