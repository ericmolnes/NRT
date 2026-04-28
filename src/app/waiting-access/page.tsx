import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ShieldCheck, LogOut } from "lucide-react";
import { requestAccess, signOutAction } from "./actions";

// Venteside for brukere med MINIMUM-tilgang. Eneste autentiserte side
// som er tilgjengelig før admin har gitt tilgang. Hvis brukeren faktisk
// har USER eller ADMIN-tilgang, redirecter vi til /dashboard.

export const dynamic = "force-dynamic";

export default async function WaitingAccessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Hvis brukeren allerede har tilgang, ikke vis ventesiden.
  if (
    session.user.accessLevel === "USER" ||
    session.user.accessLevel === "ADMIN"
  ) {
    redirect("/dashboard");
  }

  const email = session.user.email ?? null;
  const name = session.user.name ?? "Bruker";

  // Sjekk om bruker har en åpen forespørsel. Hvis ikke, opprett en
  // automatisk slik at admin ser den i panelet.
  let pending: { id: string; createdAt: Date } | null = null;
  if (email) {
    pending = await db.accessRequest.findFirst({
      where: { email, status: "PENDING" },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    if (!pending) {
      // Opprett forespørsel ved første visning. Server action er
      // idempotent, så det er trygt å kalle.
      await requestAccess();
      pending = await db.accessRequest.findFirst({
        where: { email, status: "PENDING" },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[oklch(0.965_0.006_250)] p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
            <h1
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Venter på tilgang
            </h1>
            <p className="text-sm text-muted-foreground">
              Hei {name}. Du er logget inn, men kontoen din har ikke fått
              tilgang til Nordic Rig Tech sine interne verktøy ennå.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-nrt-teal mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Tilgangsforespørsel sendt</p>
                {pending ? (
                  <p className="text-xs text-muted-foreground">
                    Sendt {new Date(pending.createdAt).toLocaleString("nb-NO")}.
                    En administrator vil behandle forespørselen.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Vi kunne ikke registrere e-posten din. Kontakt en
                    administrator direkte.
                  </p>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Du kan logge ut og prøve igjen senere. Siden oppdateres når
            tilgangen er gitt.
          </p>

          <form action={signOutAction}>
            <Button
              type="submit"
              variant="outline"
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logg ut
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
