"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";

interface DeleteButtonProps {
  action: () => Promise<{ success?: boolean; message?: string }>;
  label?: string;
  confirmMessage?: string;
}

export function DeleteButton({
  action,
  label,
  confirmMessage = "Slett?",
}: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="destructive"
          size="sm"
          className="h-6 text-[10px] px-2.5"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await action();
              if (result?.message && !result?.success) {
                setError(result.message);
                return;
              }
              setConfirming(false);
            });
          }}
        >
          {isPending ? "Sletter..." : confirmMessage}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5"
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
        {error && (
          <span className="text-[10px] text-destructive">{error}</span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors px-1 py-0.5 rounded"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-3 w-3" />
      {label && <span>{label}</span>}
    </button>
  );
}
