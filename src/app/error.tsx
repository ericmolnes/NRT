"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Noe gikk galt</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          En uventet feil oppstod. Prøv igjen, eller kontakt support hvis
          problemet vedvarer.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground/60">
            Feilkode: {error.digest}
          </p>
        )}
        <Button onClick={reset} className="mt-6">
          Prøv igjen
        </Button>
      </div>
    </div>
  );
}
