"use client";

import { useActionState } from "react";
import { triggerSync, type ActionState } from "@/app/(authenticated)/poweroffice/actions";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import type { SyncResourceType } from "@/lib/poweroffice/sync-all";

export function SyncButton({
  resource = "all",
  label = "Synkroniser",
  variant = "default",
  size = "default",
}: {
  resource?: SyncResourceType;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    triggerSync,
    {}
  );

  const conflicts = state.conflicts;
  const hasConflicts =
    !!conflicts && (conflicts.conflicts > 0 || conflicts.missingLink > 0);

  return (
    <form action={action}>
      <input type="hidden" name="resource" value={resource} />
      <Button type="submit" variant={variant} size={size} disabled={isPending}>
        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Synkroniserer..." : label}
      </Button>
      {state.message && (
        <p
          className={
            "mt-1 text-xs flex items-center gap-1 " +
            (hasConflicts ? "text-amber-600" : "text-muted-foreground")
          }
        >
          {hasConflicts && <AlertTriangle className="h-3 w-3" />}
          {state.message}
        </p>
      )}
    </form>
  );
}
