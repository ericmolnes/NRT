import { getEstimateList, getEstimateStats } from "@/lib/queries/estimates";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EstimateList } from "@/components/estimering/estimate-list";
import {
  Calculator,
  FileCheck,
  FileClock,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

export default async function EstimeringPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [stats, estimates] = await Promise.all([
    getEstimateStats(),
    getEstimateList({
      search: params.search,
      status: params.status,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimering</h1>
          <p className="text-muted-foreground">
            Prisberegning og estimering av arbeidspakker.
          </p>
        </div>
        <Button render={<Link href="/estimering/ny" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nytt estimat
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totalt estimater
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Til gjennomgang
            </CardTitle>
            <FileClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.review}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Godkjent</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
      </div>

      <EstimateList estimates={estimates} />
    </div>
  );
}
