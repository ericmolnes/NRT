import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSupplierList, getSupplierStats } from "@/lib/queries/suppliers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupplierListFilters } from "@/components/leverandorer/supplier-list-filters";
import { SupplierStatusBadge, SupplierTypeBadge } from "@/components/leverandorer/supplier-status-badge";
import {
  Truck,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    status?: string;
  }>;
}

export default async function LeverandorerPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const [suppliers, stats] = await Promise.all([
    getSupplierList(params.search, params.type, params.status),
    getSupplierStats(),
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
            Leverandører
          </h1>
          <p className="text-muted-foreground">
            ISO 9001 leverandørkontroll — {suppliers.length} leverandører
          </p>
        </div>
        <Button render={<Link href="/leverandorer/ny" />}>
          <Plus className="mr-2 h-4 w-4" />
          Ny leverandør
        </Button>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="stagger-in grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registrerte leverandører</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Godkjent</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Godkjente leverandører</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Betinget</CardTitle>
            <ShieldAlert className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.conditional}</div>
            <p className="text-xs text-muted-foreground">Betinget godkjent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Venter</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Venter godkjenning</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Åpne avvik</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.openNC}</div>
            <p className="text-xs text-muted-foreground">Uløste avvik</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters ─── */}
      <SupplierListFilters />

      {/* ─── Table ─── */}
      <div className="stagger-in">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Leverandør</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 hidden md:table-cell">Kontakt</th>
                  <th className="px-4 py-3 text-center">Eval.</th>
                  <th className="px-4 py-3 text-center">Avvik</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Utløper</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/leverandorer/${supplier.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.16_0.035_250)]/10">
                          <Truck className="h-4 w-4 text-[oklch(0.16_0.035_250)]" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-foreground group-hover:text-primary truncate block">
                            {supplier.name}
                          </span>
                          {supplier.organizationNumber && (
                            <span className="text-xs text-muted-foreground">
                              Org: {supplier.organizationNumber}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <SupplierTypeBadge type={supplier.type} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs truncate max-w-[180px]">
                      {supplier.contactPerson ?? supplier.email ?? "\u2013"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {supplier._count.evaluations}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {supplier._count.nonConformances > 0 ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-red-500/10 text-red-600 border-red-300/50"
                        >
                          {supplier._count.nonConformances}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground tabular-nums">
                      {supplier.expiresAt
                        ? new Date(supplier.expiresAt).toLocaleDateString("nb-NO")
                        : "\u2013"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SupplierStatusBadge status={supplier.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {suppliers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Truck className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Ingen leverandører funnet
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
