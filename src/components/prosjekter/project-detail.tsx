"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createJob } from "@/app/(authenticated)/jobber/[id]/actions";
import {
  ArrowLeft,
  Plus,
  Briefcase,
  Building2,
  MapPin,
  CalendarDays,
  Users,
  BarChart3,
  FolderKanban,
  FileText,
  ClipboardList,
  Settings,
  ChevronRight,
  Hash,
  Clock,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───

interface Job {
  id: string;
  name: string;
  type: string;
  status: string;
  location: string;
  startDate: Date | string;
  endDate: Date | string | null;
  rotationPattern: { id: string; name: string } | null;
  _count: { assignments: number };
}

interface ProjectData {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  location: string | null;
  customer: { id: string; name: string };
  recmanProjectId?: string | null;
  jobs: Job[];
}

// ─── Helpers ───

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Aktiv",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-300/50",
  },
  ON_HOLD: {
    label: "Pa vent",
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

const JOB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
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

function SectionTitle({
  icon: Icon,
  title,
  count,
  iconColor = "text-nrt-teal",
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-lg bg-muted ${iconColor}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h2 className="font-display text-sm font-semibold tracking-tight">
        {title}
      </h2>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
          {count}
        </Badge>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/40 last:border-b-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-xs font-medium">{children}</span>
    </div>
  );
}

// ─── Main component ───

export function ProjectDetail({ project }: { project: ProjectData }) {
  const [showJobForm, setShowJobForm] = useState(false);
  const router = useRouter();

  const statusCfg = STATUS_CONFIG[project.status] ?? {
    label: project.status,
    className: "",
  };

  const activeJobs = project.jobs.filter(
    (j) => j.status === "ACTIVE" || j.status === "DRAFT"
  );
  const completedJobs = project.jobs.filter(
    (j) => j.status === "COMPLETED" || j.status === "CANCELLED"
  );
  const totalPersonnel = project.jobs.reduce(
    (sum, j) => sum + j._count.assignments,
    0
  );

  return (
    <div className="stagger-in space-y-6 pb-12">
      {/* ═══════════════════════════════════════════════
          1. HERO HEADER
          ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-[oklch(0.16_0.035_250)] text-white noise-texture">
        <div className="relative z-10 p-6 sm:p-8">
          {/* Back button */}
          <div className="absolute top-4 left-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              render={<Link href="/prosjekter" />}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Project identity */}
          <div className="pt-6 sm:pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 shrink-0">
                    <FolderKanban className="h-6 w-6 text-nrt-teal" />
                  </div>
                  <div>
                    <h1
                      className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {project.name}
                    </h1>
                    <Link
                      href={`/kunder/${project.customer.id}`}
                      className="text-sm text-white/60 hover:text-white/90 transition-colors"
                    >
                      {project.customer.name}
                    </Link>
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 border-white/20 ${statusCfg.className}`}
              >
                {statusCfg.label}
              </Badge>
            </div>

            {project.description && (
              <p className="text-sm text-white/50 mt-3 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-white/10">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
                  Prosjektnr
                </p>
                <p className="text-sm font-medium">
                  {project.code ?? "\u2013"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
                  Bedrift
                </p>
                <p className="text-sm font-medium">{project.customer.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
                  Lokasjon
                </p>
                <p className="text-sm font-medium">
                  {project.location ?? "\u2013"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
                  Fase
                </p>
                <p className="text-sm font-medium">{statusCfg.label}</p>
              </div>
            </div>

            {/* Quick-nav icons (Recman-style) */}
            <div className="flex items-center gap-2 mt-5">
              {[
                { icon: Users, label: "Ressurser", count: totalPersonnel },
                { icon: BarChart3, label: "Nokkeltall" },
                { icon: FileText, label: "Filer" },
                { icon: ClipboardList, label: "Bemanningsplan" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-default"
                >
                  <item.icon className="h-3.5 w-3.5 text-white/50" />
                  <span className="text-xs text-white/70">{item.label}</span>
                  {item.count !== undefined && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-4 px-1.5 bg-white/10 text-white/80"
                    >
                      {item.count}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          2. AKTIVE JOBBER
          ═══════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle
            icon={Briefcase}
            title="Aktive jobber"
            count={activeJobs.length}
          />
          <Button
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setShowJobForm(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Legg til
          </Button>
        </div>

        <div className="grid gap-2">
          {activeJobs.map((job) => {
            const jobCfg = JOB_STATUS_CONFIG[job.status] ?? {
              label: job.status,
              className: "",
            };
            return (
              <Link key={job.id} href={`/jobber/${job.id}`}>
                <Card className="card-hover cursor-pointer p-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm truncate">
                              {job.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-[10px] ${jobCfg.className}`}
                            >
                              {jobCfg.label}
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
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(job.startDate)}
                              {job.endDate && ` - ${formatDate(job.endDate)}`}
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
          {activeJobs.length === 0 && (
            <Card className="p-8 text-center">
              <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Ingen aktive jobber enna
              </p>
            </Card>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          3. AVSLUTTEDE JOBBER
          ═══════════════════════════════════════════════ */}
      {completedJobs.length > 0 && (
        <section>
          <SectionTitle
            icon={Briefcase}
            title="Avsluttede jobber"
            count={completedJobs.length}
            iconColor="text-muted-foreground"
          />
          <div className="grid gap-2">
            {completedJobs.map((job) => {
              const jobCfg = JOB_STATUS_CONFIG[job.status] ?? {
                label: job.status,
                className: "",
              };
              return (
                <Link key={job.id} href={`/jobber/${job.id}`}>
                  <Card className="card-hover cursor-pointer p-0 opacity-70 hover:opacity-100">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground truncate">
                            {job.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-[10px] ${jobCfg.className}`}
                          >
                            {jobCfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          <span>{job._count.assignments} pers.</span>
                          <span>{formatDate(job.endDate)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          4. LOGG (placeholder)
          ═══════════════════════════════════════════════ */}
      <section>
        <SectionTitle
          icon={Clock}
          title="Aktivitetslogg"
          iconColor="text-muted-foreground"
        />
        <Card className="p-8 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Aktivitetslogg kommer snart
          </p>
        </Card>
      </section>

      {/* ═══ Job creation dialog ═══ */}
      {showJobForm && (
        <NewJobDialog
          projectId={project.id}
          projectName={project.name}
          customerName={project.customer.name}
          onClose={() => setShowJobForm(false)}
          onCreated={() => {
            setShowJobForm(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── New Job Dialog (kept from original) ───

function NewJobDialog({
  projectId,
  projectName,
  customerName,
  onClose,
  onCreated,
}: {
  projectId: string;
  projectName: string;
  customerName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  // Last rotasjonsmonstre via API
  if (!loaded) {
    fetch("/api/rotations")
      .then((res) => res.json())
      .then((data) => {
        setPatterns(data);
        setLoaded(true);
      });
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const result = await createJob({
      name: fd.get("name") as string,
      type: fd.get("type") as string,
      location: fd.get("location") as string,
      startDate: fd.get("startDate") as string,
      endDate: (fd.get("endDate") as string) || undefined,
      projectId,
      rotationPatternId: (fd.get("rotationPatternId") as string) || undefined,
    });

    setSaving(false);
    if (result.success) {
      onCreated();
      if (result.id) router.push(`/jobber/${result.id}`);
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-[460px] ring-1 ring-foreground/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ny jobb
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {customerName} &middot; {projectName}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label className="text-xs">Jobbnavn *</Label>
            <Input
              name="name"
              className="h-9 mt-1"
              required
              placeholder="F.eks. Elektro Q1 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type *</Label>
              <Select name="type" defaultValue="TIME_LIMITED">
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIME_LIMITED">Tidsavgrenset</SelectItem>
                  <SelectItem value="ONGOING">Lopende</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Lokasjon *</Label>
              <Input
                name="location"
                className="h-9 mt-1"
                required
                placeholder="Aker Verdal"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Startdato *</Label>
              <Input name="startDate" type="date" className="h-9 mt-1" required />
            </div>
            <div>
              <Label className="text-xs">Sluttdato</Label>
              <Input name="endDate" type="date" className="h-9 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Rotasjonsmoenster</Label>
            <Select name="rotationPatternId">
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Velg moenster..." />
              </SelectTrigger>
              <SelectContent>
                {patterns.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Avbryt
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Oppretter..." : "Opprett jobb"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
