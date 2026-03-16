import Link from "next/link";
import { Building, FolderKanban, UserRound, Receipt } from "lucide-react";
import { isAdmin } from "@/lib/rbac";
import { getPODashboardStats, getLatestSyncPerResource } from "@/lib/queries/poweroffice";
import { SyncStatusCard } from "@/components/poweroffice/sync-status-card";
import { SyncButton } from "@/components/poweroffice/sync-button";

export default async function PowerOfficeDashboardPage() {
  const [stats, syncStatus, admin] = await Promise.all([
    getPODashboardStats(),
    getLatestSyncPerResource(),
    isAdmin(),
  ]);

  const cards = [
    { label: "Kunder", key: "Customer" as const, count: stats.customers, icon: Building, href: "/poweroffice/kunder" },
    { label: "Prosjekter", key: "Project" as const, count: stats.projects, icon: FolderKanban, href: "/poweroffice/prosjekter" },
    { label: "Ansatte", key: "Employee" as const, count: stats.employees, icon: UserRound, href: "/personell?sync=po" },
    { label: "Fakturaer", key: "Invoice" as const, count: stats.invoices, icon: Receipt, href: "/poweroffice/fakturaer" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PowerOffice Go</h1>
          <p className="text-muted-foreground">
            Synkronisering med PowerOffice Go regnskapssystem
          </p>
        </div>
        {admin && <SyncButton resource="all" label="Synkroniser alle" />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.key} href={card.href}>
            <SyncStatusCard
              label={card.label}
              syncLog={syncStatus[card.key]}
              count={card.count}
            />
          </Link>
        ))}
      </div>

      {stats.customers === 0 && stats.projects === 0 && stats.employees === 0 && stats.invoices === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Ingen data synkronisert ennå.{" "}
            {admin
              ? 'Klikk "Synkroniser alle" for å hente data fra PowerOffice Go.'
              : "Kontakt en administrator for å starte synkronisering."}
          </p>
        </div>
      )}
    </div>
  );
}
