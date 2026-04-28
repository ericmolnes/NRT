import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listNotificationsForUser } from "@/lib/notifications/list-notifications";
import type { NotificationClient } from "@/lib/notifications/types";

// Server-komponent som lister de siste varslene rettet mot ADMIN-nivå
// eller direkte til den innloggede brukeren. Brukes i innstillinger som
// en oversikt over hva som har skjedd i systemet.

interface NotificationsPanelProps {
  userId: string | null;
  accessLevel: "MINIMUM" | "USER" | "ADMIN";
}

const SEVERITY_STYLES: Record<string, string> = {
  INFO: "bg-blue-100 text-blue-700",
  WARNING: "bg-amber-100 text-amber-700",
  ERROR: "bg-red-100 text-red-700",
};

export async function NotificationsPanel({
  userId,
  accessLevel,
}: NotificationsPanelProps) {
  const items = await listNotificationsForUser(
    db as unknown as NotificationClient,
    { userId, accessLevel, limit: 10 }
  );

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          Ingen varsler.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{item.title}</p>
                <Badge
                  variant="secondary"
                  className={`text-[10px] shrink-0 ${
                    SEVERITY_STYLES[item.severity] ?? ""
                  }`}
                >
                  {item.severity}
                </Badge>
              </div>
              {item.body && (
                <p className="text-xs text-muted-foreground">{item.body}</p>
              )}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{item.kind}</span>
                <span>·</span>
                <span>{new Date(item.createdAt).toLocaleString("nb-NO")}</span>
                {item.readAt === null && (
                  <>
                    <span>·</span>
                    <span className="text-blue-600 font-medium">Ulest</span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
