"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Noe gikk galt</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          En uventet feil oppstod. Prøv igjen, eller gå tilbake til dashboard.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground/60">
            Feilkode: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" render={<Link href="/dashboard" />}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button onClick={reset}>Prøv igjen</Button>
        </div>
      </div>
    </div>
  );
}
