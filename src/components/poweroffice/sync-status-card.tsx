import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { POSyncLog } from "@/generated/prisma/client";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "Akkurat nå";
  if (diffMin < 60) return `${diffMin} min siden`;
  if (diffHours < 24) return `${diffHours} timer siden`;
  return `${diffDays} dager siden`;
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="default">Fullført</Badge>;
    case "running":
      return <Badge variant="secondary">Kjører</Badge>;
    case "failed":
      return <Badge variant="destructive">Feilet</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function SyncStatusCard({
  label,
  syncLog,
  count,
}: {
  label: string;
  syncLog: POSyncLog | null;
  count: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {syncLog && statusBadge(syncLog.status)}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-xs text-muted-foreground">
          {syncLog
            ? `Sist synkronisert ${formatRelativeTime(syncLog.startedAt)} — ${syncLog.recordsSynced} poster`
            : "Aldri synkronisert"}
        </p>
      </CardContent>
    </Card>
  );
}
