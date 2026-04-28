"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertTriangle } from "lucide-react";
import { triggerRecmanSync } from "@/app/(authenticated)/recman/actions";
import type { SyncResult } from "@/lib/sync/sync-queue";

interface RecmanSyncButtonProps {
  label?: string;
}

export function SyncButton({ label = "Synk Recman" }: RecmanSyncButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<{ message: string; conflicts: SyncResult } | null>(
    null
  );

  function handleSync() {
    setSummary(null);
    startTransition(async () => {
      const result = await triggerRecmanSync();
      setSummary({ message: result.message, conflicts: result.conflicts });
    });
  }

  const hasConflicts =
    !!summary && (summary.conflicts.conflicts > 0 || summary.conflicts.missingLink > 0);

  return (
    <div className="flex items-center gap-2">
      {summary && (
        <span
          className={
            "text-[10px] flex items-center gap-1 " +
            (hasConflicts ? "text-amber-600" : "text-emerald-600")
          }
          title={summary.message}
        >
          {hasConflicts ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {summary.message}
        </span>
      )}
      <Button
        onClick={handleSync}
        disabled={isPending}
        variant="outline"
        size="sm"
        className="h-7 text-xs px-2"
      >
        <RefreshCw
          className={`h-3.5 w-3.5 mr-1.5 ${isPending ? "animate-spin" : ""}`}
        />
        {isPending ? "Synker..." : label}
      </Button>
    </div>
  );
}
