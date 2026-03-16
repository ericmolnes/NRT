import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCustomerList, getCustomerStats } from "@/lib/queries/customers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerListFilters } from "@/components/kunder/customer-list-filters";
import {
  Building2,
  Users,
  UserCheck,
  Link2,
  Plus,
  FolderKanban,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
  }>;
}

export default async function KunderPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const [customers, stats] = await Promise.all([
    getCustomerList(params.search, params.type),
    getCustomerStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Kunder
          </h1>
          <p className="text-muted-foreground">
            {customers.length} bedrifter registrert
          </p>
        </div>
        <Button render={<Link href="/kunder/ny" />}>
          <Plus className="mr-2 h-4 w-4" />
          Ny kunde
        </Button>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="stagger-in grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Registrert i systemet
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Aktive kunder</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recman</CardTitle>
            <Link2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recmanSynced}</div>
            <p className="text-xs text-muted-foreground">
              Koblet til Recman
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PowerOffice</CardTitle>
            <Link2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.poSynced}</div>
            <p className="text-xs text-muted-foreground">Koblet til PO Go</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters ─── */}
      <CustomerListFilters />

      {/* ─── Table ─── */}
      <div className="stagger-in">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Navn</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 hidden md:table-cell">E-post</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Org.nr</th>
                  <th className="px-4 py-3 text-center">Prosjekter</th>
                  <th className="px-4 py-3 text-right">Synk</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/kunder/${customer.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.16_0.035_250)]/10">
                          <Building2 className="h-4 w-4 text-[oklch(0.16_0.035_250)]" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-foreground group-hover:text-primary truncate block">
                            {customer.name}
                          </span>
                          {customer.contacts[0] && (
                            <span className="text-xs text-muted-foreground truncate block">
                              {customer.contacts[0].name}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={customer.recmanCompanyType} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">
                      {customer.emailAddress ?? "\u2013"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground tabular-nums">
                      {customer.organizationNumber ?? "\u2013"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <FolderKanban className="h-3.5 w-3.5" />
                        {customer._count.projects}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {customer.poCustomerId && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-blue-300/60 text-blue-700 bg-blue-50/50"
                          >
                            PO
                          </Badge>
                        )}
                        {customer.recmanCompanyId && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-emerald-300/60 text-emerald-700 bg-emerald-50/50"
                          >
                            Recman
                          </Badge>
                        )}
                        {!customer.poCustomerId && !customer.recmanCompanyId && (
                          <span className="text-xs text-muted-foreground">\u2013</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Ingen kunder funnet
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string | null }) {
  const config: Record<
    string,
    { label: string; className: string }
  > = {
    customer: {
      label: "Kunde",
      className: "bg-blue-500/15 text-blue-700 border-blue-300/50",
    },
    prospect: {
      label: "Prospekt",
      className: "bg-amber-500/15 text-amber-700 border-amber-300/50",
    },
    collaborator: {
      label: "Samarbeidspartner",
      className: "bg-violet-500/15 text-violet-700 border-violet-300/50",
    },
    ownCompany: {
      label: "Eget selskap",
      className: "bg-emerald-500/15 text-emerald-700 border-emerald-300/50",
    },
  };

  const c = type ? config[type] : null;
  if (!c) {
    return (
      <Badge variant="secondary" className="text-[10px]">
        Ukjent
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`text-[10px] ${c.className}`}>
      {c.label}
    </Badge>
  );
}
