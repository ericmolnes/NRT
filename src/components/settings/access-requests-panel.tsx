import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Check, X } from "lucide-react";
import {
  approveAccessRequest,
  denyAccessRequest,
} from "@/app/(authenticated)/settings/actions";

// Server-komponent som lister åpne tilgangsforespørsler. Knappene bruker
// form actions for å kalle server actions direkte uten en egen client-
// komponent. En enkel admin-flyt: gi USER, gi ADMIN, eller avslå.

export async function AccessRequestsPanel() {
  const pending = await db.accessRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      displayName: true,
      requestedLevel: true,
      reason: true,
      createdAt: true,
    },
  });

  if (pending.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          Ingen åpne tilgangsforespørsler.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {pending.map((req) => (
            <li key={req.id} className="p-4 space-y-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm font-medium truncate">
                    {req.displayName ?? req.email}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {req.email}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="secondary" className="text-[10px]">
                    Ber om {req.requestedLevel}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(req.createdAt).toLocaleString("nb-NO")}
                  </span>
                </div>
                {req.reason && (
                  <p className="text-xs text-muted-foreground pt-1 italic">
                    &ldquo;{req.reason}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <form
                  action={async () => {
                    "use server";
                    await approveAccessRequest(req.id, "USER");
                  }}
                >
                  <Button type="submit" size="sm" variant="default">
                    <Check className="h-3 w-3" />
                    Gi USER
                  </Button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await approveAccessRequest(req.id, "ADMIN");
                  }}
                >
                  <Button type="submit" size="sm" variant="secondary">
                    <Check className="h-3 w-3" />
                    Gi ADMIN
                  </Button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await denyAccessRequest(req.id);
                  }}
                >
                  <Button type="submit" size="sm" variant="destructive">
                    <X className="h-3 w-3" />
                    Avslå
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
