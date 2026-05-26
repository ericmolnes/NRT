import { Suspense } from "react";
import {
  getPersonnelSyncStats,
  getDistinctDepartments,
} from "@/lib/queries/personnel";
import {
  getPersonnelishList,
  type PersonnelSortBy,
  type SortDirection,
} from "@/lib/queries/personnel-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonnelList } from "@/components/personell/personnel-list";
import { PersonnelFilters } from "@/components/personell/personnel-filters";
import { CreatePersonSheet } from "@/components/personell/create-person-sheet";
import { Users, UserCheck, Link2 } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    department?: string;
    status?: string;
    sync?: "po" | "recman" | "unlinked";
    category?: "ALL" | "ANSATT" | "INNLEID" | "KANDIDAT";
    role?: string;
    city?: string;
    company?: string;
    skill?: string;
    minRating?: string;
    license?: string;
    language?: string;
    evals?: "yes" | "no";
    sort?: PersonnelSortBy;
    dir?: SortDirection;
  }>;
}

export default async function PersonnelPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const category =
    params.category === "ALL" ? undefined : params.category ?? "ANSATT";
  const [stats, personnel, departments] = await Promise.all([
    getPersonnelSyncStats(),
    getPersonnelishList({
      search: params.search,
      role: params.role,
      department: params.department,
      status: params.status,
      syncStatus: params.sync,
      category,
      city: params.city,
      company: params.company,
      skill: params.skill,
      minRating: params.minRating ? parseInt(params.minRating, 10) : undefined,
      license: params.license,
      language: params.language,
      hasEvaluations: params.evals,
      sortBy: params.sort,
      sortDirection: params.dir,
      includeUnpersonneledCandidates: category !== "ANSATT",
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
            Samlet oversikt over ansatte, innleide og kandidater med synk-status.
          </p>
        </div>
        <CreatePersonSheet defaultContractor={false} triggerLabel="Nytt personell" />
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
