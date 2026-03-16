import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getJobList } from "@/lib/queries/jobs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Briefcase,
  Search,
  MapPin,
  Users,
  CalendarDays,
  ChevronRight,
  FolderKanban,
  RotateCcw,
  Building2,
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
  DRAFT: {
    label: "Utkast",
    className: "bg-amber-500/15 text-amber-700 border-amber-300/50",
  },
  ON_HOLD: {
    label: "Pa vent",
    className: "bg-zinc-500/15 text-zinc-600 border-zinc-300/50",
  },
  COMPLETED: {
    label: "Fullfort",
    className: "bg-blue-500/15 text-blue-700 border-blue-300/50",
  },
  CANCELLED: {
    label: "Kansellert",
    className: "bg-red-500/15 text-red-700 border-red-300/50",
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

export default async function JobberPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const jobs = await getJobList(params.search, undefined, params.status);

  const activeCount = jobs.filter((j) => j.status === "ACTIVE").length;
  const totalPersonnel = jobs.reduce(
    (sum, j) => sum + j._count.assignments,
    0
  );

  // Group jobs by project
  const grouped = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      customerName: string;
      jobs: typeof jobs;
    }
  >();

  for (const job of jobs) {
    const key = job.project.id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        projectId: job.project.id,
        projectName: job.project.name,
        customerName: job.project.customer.name,
        jobs: [],
      });
    }
    grouped.get(key)!.jobs.push(job);
  }

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Jobber
          </h1>
          <p className="text-muted-foreground">
            {jobs.length} jobber &middot; {totalPersonnel} personell tilordnet
          </p>
        </div>
      </div>

      {/* ═══ Stats ═══ */}
      <div className="stagger-in grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totalt</p>
                <p className="text-2xl font-bold">{jobs.length}</p>
              </div>
              <Briefcase className="h-5 w-5 text-muted-foreground" />
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
              <Briefcase className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Personell</p>
                <p className="text-2xl font-bold">{totalPersonnel}</p>
              </div>
              <Users className="h-5 w-5 text-nrt-teal" />
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
            placeholder="Sok i jobber..."
            defaultValue={params.search ?? ""}
            className="pl-9 h-9"
          />
          {params.status && (
            <input type="hidden" name="status" value={params.status} />
          )}
        </form>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "", label: "Alle" },
            { value: "ACTIVE", label: "Aktive" },
            { value: "DRAFT", label: "Utkast" },
            { value: "ON_HOLD", label: "Pa vent" },
            { value: "COMPLETED", label: "Fullfort" },
            { value: "CANCELLED", label: "Kansellert" },
          ].map((opt) => {
            const isActive = (params.status ?? "") === opt.value;
            return (
              <Link
                key={opt.value}
                href={`/jobber?${new URLSearchParams({
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

      {/* ═══ Grouped job list ═══ */}
      <div className="stagger-in space-y-6">
        {Array.from(grouped.values()).map((group) => (
          <section key={group.projectId}>
            {/* Project group header */}
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-nrt-teal">
                <FolderKanban className="h-3.5 w-3.5" />
              </div>
              <Link
                href={`/prosjekter/${group.projectId}`}
                className="group flex items-center gap-2"
              >
                <h2 className="font-display text-sm font-semibold tracking-tight group-hover:text-nrt-teal transition-colors">
                  {group.projectName}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {group.customerName}
                </span>
              </Link>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {group.jobs.length}
              </Badge>
            </div>

            {/* Jobs in this project */}
            <div className="grid gap-2 ml-9">
              {group.jobs.map((job) => {
                const statusCfg = STATUS_CONFIG[job.status] ?? {
                  label: job.status,
                  className: "",
                };
                return (
                  <Link key={job.id} href={`/jobber/${job.id}`}>
                    <Card className="card-hover cursor-pointer p-0">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                              <Briefcase className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm truncate">
                                  {job.name}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className={`shrink-0 text-[10px] ${statusCfg.className}`}
                                >
                                  {statusCfg.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {job.location}
                                </span>
                                {job.rotationPattern && (
                                  <span className="flex items-center gap-1">
                                    <RotateCcw className="h-3 w-3" />
                                    {job.rotationPattern.name}
                                  </span>
                                )}
                                <span className="hidden sm:flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {formatDate(job.startDate)}
                                  {job.endDate &&
                                    ` \u2013 ${formatDate(job.endDate)}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span>{job._count.assignments}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {jobs.length === 0 && (
          <Card className="p-12 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Ingen jobber funnet
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Opprett jobber fra et prosjekt for a komme i gang
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
