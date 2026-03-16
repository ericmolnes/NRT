import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjectList } from "@/lib/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  FolderKanban,
  Search,
  Plus,
  Briefcase,
  Building2,
  ChevronRight,
  Users,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Aktiv",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-300/50",
  },
  ON_HOLD: {
    label: "På vent",
    className: "bg-zinc-500/15 text-zinc-600 border-zinc-300/50",
  },
  COMPLETED: {
    label: "Fullfort",
    className: "bg-blue-500/15 text-blue-700 border-blue-300/50",
  },
  ARCHIVED: {
    label: "Arkivert",
    className: "bg-zinc-500/15 text-zinc-500 border-zinc-300/50",
  },
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "\u2013";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "\u2013";
  return d.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ProsjekterPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const projects = await getProjectList(params.search, undefined, params.status);

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;
  const totalJobs = projects.reduce((sum, p) => sum + p._count.jobs, 0);

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Prosjekter
          </h1>
          <p className="text-muted-foreground">
            {projects.length} prosjekter &middot; {totalJobs} jobber totalt
          </p>
        </div>
        <Button render={<Link href="/prosjekter/ny" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nytt prosjekt
        </Button>
      </div>

      {/* ═══ Stats cards ═══ */}
      <div className="stagger-in grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totalt</p>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktive</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
              <FolderKanban className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jobber</p>
                <p className="text-2xl font-bold">{totalJobs}</p>
              </div>
              <Briefcase className="h-5 w-5 text-nrt-teal" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Filters ═══ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Sok i prosjekter..."
            defaultValue={params.search ?? ""}
            className="pl-9 h-9"
          />
          {params.status && (
            <input type="hidden" name="status" value={params.status} />
          )}
        </form>
        <div className="flex gap-2">
          {[
            { value: "", label: "Alle" },
            { value: "ACTIVE", label: "Aktive" },
            { value: "ON_HOLD", label: "Pa vent" },
            { value: "COMPLETED", label: "Fullfort" },
          ].map((opt) => {
            const isActive = (params.status ?? "") === opt.value;
            return (
              <Link
                key={opt.value}
                href={`/prosjekter?${new URLSearchParams({
                  ...(params.search ? { search: params.search } : {}),
                  ...(opt.value ? { status: opt.value } : {}),
                }).toString()}`}
              >
                <Badge
                  variant={isActive ? "default" : "outline"}
                  className={`cursor-pointer text-xs px-3 py-1 ${
                    isActive ? "" : "hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </Badge>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ═══ Project list ═══ */}
      <div className="stagger-in grid gap-3">
        {projects.map((project) => {
          const statusCfg = STATUS_CONFIG[project.status] ?? {
            label: project.status,
            className: "",
          };
          return (
            <Link key={project.id} href={`/prosjekter/${project.id}`}>
              <Card className="card-hover cursor-pointer p-0">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: icon + info */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-nrt-teal/10 text-nrt-teal shrink-0">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className="font-semibold text-sm truncate"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {project.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-[10px] ${statusCfg.className}`}
                          >
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {project.customer.name}
                          </span>
                          {project.code && (
                            <span className="text-xs text-muted-foreground">
                              #{project.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: stats + arrow */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {project._count.jobs} jobber
                        </span>
                        <span className="text-muted-foreground/50">
                          Oppdatert {formatDate(project.updatedAt)}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {projects.length === 0 && (
          <Card className="p-12 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Ingen prosjekter funnet
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Opprett et nytt prosjekt for a komme i gang
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
