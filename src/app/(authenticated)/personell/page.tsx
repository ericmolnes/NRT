import { Suspense } from "react";
import {
  getPersonnelList,
  getPersonnelSyncStats,
  getDistinctDepartments,
} from "@/lib/queries/personnel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonnelList } from "@/components/personell/personnel-list";
import { PersonnelFilters } from "@/components/personell/personnel-filters";
import { Users, UserCheck, Link2, Plus } from "lucide-react";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    department?: string;
    status?: string;
    sync?: string;
  }>;
}

export default async function PersonnelPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [stats, personnel, departments] = await Promise.all([
    getPersonnelSyncStats(),
    getPersonnelList({
      search: params.search,
      department: params.department,
      status: params.status,
      syncStatus: params.sync,
    }),
    getDistinctDepartments(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Personell
          </h1>
          <p className="text-muted-foreground">
            Samlet oversikt over ansatte med synk-status.
          </p>
        </div>
        <Button render={<Link href="/personell/ny" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nytt personell
        </Button>
      </div>

      <div className="stagger-in grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
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
            <p className="text-xs text-muted-foreground">Aktivt personell</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              PowerOffice
            </CardTitle>
            <Link2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.poLinked}</div>
            <p className="text-xs text-muted-foreground">Koblet til PO Go</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recman</CardTitle>
            <Link2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recmanLinked}</div>
            <p className="text-xs text-muted-foreground">
              Koblet til Recman
            </p>
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full max-w-sm" />}>
        <PersonnelFilters departments={departments} />
      </Suspense>

      <PersonnelList personnel={personnel} />
    </div>
  );
}
