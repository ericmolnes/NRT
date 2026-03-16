"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-white">Noe gikk galt</h2>
        <p className="mt-2 text-sm text-[oklch(0.58_0.015_250)]">
          En uventet feil oppstod. Prøv igjen.
        </p>
        <Button onClick={reset} className="mt-6">
          Prøv igjen
        </Button>
      </div>
    </div>
  );
}
