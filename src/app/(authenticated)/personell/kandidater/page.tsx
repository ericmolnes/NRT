import {
  searchCandidates,
  getCandidateStats,
} from "@/app/(authenticated)/recman/actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Star, Wrench, Award, HardHat } from "lucide-react";
import { CandidateListView } from "@/components/kandidater/candidate-list-view";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    skill?: string;
    city?: string;
    minRating?: string;
    license?: string;
    language?: string;
    page?: string;
  }>;
}

export default async function KandidaterPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const [result, stats] = await Promise.all([
    searchCandidates({ ...params, filter: "candidates" }),
    getCandidateStats(),
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
            Kandidater
          </h1>
          <p className="text-muted-foreground">
            Kandidatpool fra RecMan — ikke registrert som ansatt
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stagger-in grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Kandidater i pool
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Innleide</CardTitle>
            <HardHat className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contractors}</div>
            <p className="text-xs text-muted-foreground">
              Merket som innleid
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vurderte</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rated}</div>
            <p className="text-xs text-muted-foreground">
              Med rating i RecMan
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Med kompetanse</CardTitle>
            <Wrench className="h-4 w-4" style={{ color: "var(--nrt-teal, oklch(0.89 0.17 178))" }} />
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
            <CardTitle className="text-sm font-medium">Toppkandidater</CardTitle>
            <Award className="h-4 w-4" style={{ color: "var(--nrt-orange, oklch(0.72 0.18 55))" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topRated}</div>
            <p className="text-xs text-muted-foreground">
              Rating 4–5 stjerner
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kandidatliste */}
      <CandidateListView
        candidates={result.candidates}
        total={result.total}
        totalPages={result.totalPages}
        currentPage={result.currentPage}
        filters={params}
      />
    </div>
  );
}
