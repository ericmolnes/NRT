import {
  searchContractors,
  getContractorStats,
} from "@/app/(authenticated)/personell/innleide/actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HardHat, Users, Clock, Wrench, ClipboardCheck } from "lucide-react";
import { ContractorListView } from "@/components/innleide/contractor-list-view";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    skill?: string;
    city?: string;
    company?: string;
    minRating?: string;
    license?: string;
    language?: string;
    page?: string;
  }>;
}

export default async function InnleidePage({ searchParams }: PageProps) {
  const params = await searchParams;

  const [result, stats] = await Promise.all([
    searchContractors(params),
    getContractorStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Innleide
          </h1>
          <p className="text-muted-foreground">
            Innleid personell — historikk, kompetanse og import
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stagger-in grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <HardHat className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Innleide totalt
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Aktive innleide nå
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tidligere</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.former}</div>
            <p className="text-xs text-muted-foreground">
              Har avsluttet periode
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Med kompetanse</CardTitle>
            <Wrench
              className="h-4 w-4"
              style={{ color: "var(--nrt-teal, oklch(0.89 0.17 178))" }}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withSkills}</div>
            <p className="text-xs text-muted-foreground">
              Har registrerte skills
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluert</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              Har minst 1 evaluering
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Innleid-liste */}
      <ContractorListView
        contractors={result.contractors}
        total={result.total}
        totalPages={result.totalPages}
        currentPage={result.currentPage}
        filters={params}
      />
    </div>
  );
}
