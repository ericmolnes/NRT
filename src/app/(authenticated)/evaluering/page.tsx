import { Suspense } from "react";
import {
  getEvaluations,
  getEvaluationStats,
  getDistinctRigs,
} from "@/lib/queries/evaluations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EvaluationsTable } from "@/components/evaluering/evaluations-table";
import { EvaluationFilters } from "@/components/evaluering/evaluation-filters";
import {
  ClipboardCheck,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{ search?: string; rig?: string }>;
}

export default async function EvaluationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [stats, evaluations, rigs] = await Promise.all([
    getEvaluationStats(),
    getEvaluations({
      search: params.search,
      rig: params.rig,
    }),
    getDistinctRigs(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Evalueringer
          </h1>
          <p className="text-muted-foreground">
            Oversikt over alle personellevalueringer.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totalt personell
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPersonnel}</div>
            <p className="text-xs text-muted-foreground">
              Registrerte ansatte
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Evalueringer
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              Gjennomførte evalueringer
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gjennomsnittsscore
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageScore !== null
                ? stats.averageScore.toFixed(1)
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Snitt alle evalueringer
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Siste evaluering
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.latestEvaluationDate
                ? stats.latestEvaluationDate.toLocaleDateString("nb-NO")
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.latestEvaluationDate ? "Dato" : "Ingen evalueringer ennå"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full max-w-sm" />}>
        <EvaluationFilters rigs={rigs} />
      </Suspense>

      <EvaluationsTable evaluations={evaluations} />
    </div>
  );
}
