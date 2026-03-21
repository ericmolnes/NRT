import { Suspense } from "react";
import {
  getEvaluations,
  getEvaluationStats,
} from "@/lib/queries/evaluations";
import { Card, CardContent } from "@/components/ui/card";
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
  searchParams: Promise<{
    search?: string;
    role?: string;
    score?: string;
  }>;
}

export default async function EvaluationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [stats, evaluations] = await Promise.all([
    getEvaluationStats(),
    getEvaluations({
      search: params.search,
      role: params.role,
      scoreRange: (params.score as "high" | "mid" | "low") || undefined,
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-display">
          Evalueringer
        </h1>
        <p className="text-muted-foreground mt-1">
          Oversikt over alle personellevalueringer.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 stagger-in">
        <Card className="card-hover">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
              <Users className="h-5 w-5 text-nrt-teal" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {stats.totalPersonnel}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Personell
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
              <ClipboardCheck className="h-5 w-5 text-nrt-teal" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {stats.totalEvaluations}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Evalueringer
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
              <TrendingUp className="h-5 w-5 text-nrt-teal" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {stats.averageScore !== null
                  ? stats.averageScore.toFixed(1)
                  : "–"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Snittsscore
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
              <Calendar className="h-5 w-5 text-nrt-teal" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {stats.latestEvaluationDate
                  ? stats.latestEvaluationDate.toLocaleDateString("nb-NO")
                  : "–"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Siste evaluering
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Suspense fallback={<Skeleton className="h-10 w-full max-w-sm" />}>
        <EvaluationFilters />
      </Suspense>

      {/* Table */}
      <EvaluationsTable evaluations={evaluations} />
    </div>
  );
}
