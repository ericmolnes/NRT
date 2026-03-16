"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check } from "lucide-react";
import { triggerRecmanSync } from "@/app/(authenticated)/recman/actions";

interface RecmanSyncButtonProps {
  label?: string;
}

export function SyncButton({ label = "Synk Recman" }: RecmanSyncButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleSync() {
    setDone(false);
    startTransition(async () => {
      await triggerRecmanSync();
      setDone(true);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {done && (
        <span className="text-[10px] text-emerald-600 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Ferdig
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
