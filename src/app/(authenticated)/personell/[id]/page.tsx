import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getPersonnelById,
  getPersonnelJobsAndResources,
} from "@/lib/queries/personnel";
import { getFieldCategories } from "@/lib/queries/custom-fields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/evaluering/score-badge";
import { EVALUATION_CRITERIA } from "@/lib/validations/evaluation";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Smartphone,
  MapPin,
  Linkedin,
  Star,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Briefcase,
  GraduationCap,
  FolderKanban,
  Languages,
  Car,
  Users,
  Wrench,
  Heart,
  FileText,
  CalendarDays,
  RotateCcw,
  ClipboardList,
  Cloud,
  RefreshCw,
  Building2,
  Flag,
  ChevronDown,
  Paperclip,
  Download,
} from "lucide-react";
import Link from "next/link";
import { DeleteButton } from "@/components/personell/delete-button";
import { deleteEvaluation, deleteNote } from "@/app/(authenticated)/personell/[id]/actions";

// ─── Type helpers for JSON fields ───

interface RecmanCourse {
  courseId?: string;
  name: string;
  issueDate?: string;
  expiryDate?: string;
  description?: string;
  verified?: boolean;
  files?: Array<{ fileId: string; fileName: string; url: string }>;
}

interface RecmanExperience {
  company?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  location?: string;
}

interface RecmanProjectExperience {
  projectExperienceId?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  current?: string;
  description?: string;
}

interface RecmanEducation {
  institution?: string;
  degree?: string;
  startDate?: string;
  endDate?: string;
}

interface RecmanSkill {
  name: string;
  level?: string;
}

interface RecmanLanguage {
  name: string;
  level?: string;
}

interface RecmanRelative {
  relativeId?: string;
  name: string;
  relation?: string;
  email?: string;
  mobilePhone?: string;
}

interface RecmanReference {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
}

function castArray<T>(
  raw: unknown,
  guard: (v: unknown) => v is T
): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(guard);
}

function castStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasName(v: unknown): boolean {
  return isObj(v) && "name" in v && typeof v.name === "string";
}
function isCourse(v: unknown): v is RecmanCourse {
  return hasName(v);
}
function isExperience(v: unknown): v is RecmanExperience {
  return isObj(v);
}
function isProjectExperience(v: unknown): v is RecmanProjectExperience {
  return isObj(v);
}
function isEducation(v: unknown): v is RecmanEducation {
  return isObj(v);
}
function isSkill(v: unknown): v is RecmanSkill {
  return hasName(v);
}
function isLanguage(v: unknown): v is RecmanLanguage {
  return hasName(v);
}
function isRelative(v: unknown): v is RecmanRelative {
  return hasName(v);
}
function isReference(v: unknown): v is RecmanReference {
  return isObj(v);
}

interface RecmanFile {
  fileId?: string;
  fileName?: string;
  url?: string;
  category?: string;
}

function isFile(v: unknown): v is RecmanFile {
  return isObj(v) && "url" in v;
}

// ─── Date helpers ───

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "\u2013";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "\u2013";
  return d.toLocaleDateString("nb-NO");
}

function formatDateTime(date: Date | null): string {
  if (!date) return "\u2013";
  return new Date(date).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Section wrapper with stagger animation ───

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`${className}`}>{children}</section>;
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

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/25"
          }`}
        />
      ))}
    </span>
  );
}

function DataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right truncate">
        {children}
      </span>
    </div>
  );
}

// ─── Page props ───

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonnelDetailPage({
  params,
}: PageProps) {
  const [{ id }, session] = await Promise.all([params, auth()]);

  const [personnel, categories] = await Promise.all([
    getPersonnelById(id),
    getFieldCategories(),
  ]);

  if (!personnel) {
    notFound();
  }

  const jobsData = await getPersonnelJobsAndResources(id);

  const rc = personnel.recmanCandidate;
  const po = personnel.poEmployee;

  // Parse Recman JSON fields
  const courses = castArray(rc?.courses, isCourse);
  const experience = castArray(rc?.experience, isExperience);
  const projectExperience = castArray(
    rc?.projectExperience,
    isProjectExperience
  );
  const education = castArray(rc?.education, isEducation);
  const skills = castArray(rc?.skills, isSkill);
  const languages = castArray(rc?.languages, isLanguage);
  const relatives = castArray(rc?.relatives, isRelative);
  const references = castArray(rc?.references, isReference);
  const files = castArray(rc?.files, isFile);
  const driversLicense = castStringArray(rc?.driversLicense);

  // Evaluation stats
  const avgScore =
    personnel.evaluations.length > 0
      ? (
          personnel.evaluations.reduce((s, e) => s + e.score, 0) /
          personnel.evaluations.length
        ).toFixed(1)
      : null;

  // Status config
  const statusConfig: Record<string, { label: string; className: string }> = {
    ACTIVE: {
      label: "Aktiv",
      className: "bg-emerald-500/15 text-emerald-700 border-emerald-300/50",
    },
    INACTIVE: {
      label: "Inaktiv",
      className: "bg-amber-500/15 text-amber-700 border-amber-300/50",
    },
    ARCHIVED: {
      label: "Arkivert",
      className: "bg-zinc-500/15 text-zinc-600 border-zinc-300/50",
    },
  };

  const status = statusConfig[personnel.status] ?? {
    label: personnel.status,
    className: "",
  };

  // Custom fields
  const fieldValueMap: Record<string, string> = {};
  for (const fv of personnel.fieldValues) {
    fieldValueMap[fv.fieldId] = fv.value;
  }

  // Job data
  const activeAssignments = jobsData.assignments.filter((a) => a.isActive);

  // Initials for avatar
  const initials = personnel.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Course status helper
  function getCourseStatus(course: RecmanCourse) {
    const days = daysUntil(course.expiryDate);
    if (days === null)
      return {
        color: "border-border bg-card",
        label: "Ingen utløp",
        icon: ShieldCheck,
        iconColor: "text-muted-foreground",
      };
    if (days < 0)
      return {
        color: "border-red-300/60 bg-red-50/50",
        label: "Utløpt",
        icon: ShieldX,
        iconColor: "text-red-600",
      };
    if (days <= 90)
      return {
        color: "border-amber-300/60 bg-amber-50/50",
        label: `${days}d igjen`,
        icon: ShieldAlert,
        iconColor: "text-amber-600",
      };
    return {
      color: "border-emerald-300/60 bg-emerald-50/50",
      label: "Gyldig",
      icon: ShieldCheck,
      iconColor: "text-emerald-600",
    };
  }

  return (
    <div className="stagger-in space-y-6 pb-12">
      {/* ═══════════════════════════════════════════════
          1. PROFILE HERO HEADER
          ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-[oklch(0.16_0.035_250)] text-white noise-texture">
        <div className="relative z-10 p-6 sm:p-8">
          {/* Top buttons */}
          <div className="absolute top-4 left-4 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-white/60 hover:text-white hover:bg-white/10"
              render={<Link href="/personell" />}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10 text-xs"
              render={<Link href={`/personell/${id}/rediger`} />}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Rediger
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6 pt-6 sm:pt-2">
            {/* Avatar */}
            <div className="relative shrink-0">
              {rc?.imageUrl ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-2 ring-white/20 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={rc.imageUrl}
                    alt={personnel.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-2 ring-white/20 bg-[oklch(0.25_0.04_250)] flex items-center justify-center">
                  <span className="font-display text-2xl sm:text-3xl font-bold text-white/80">
                    {initials}
                  </span>
                </div>
              )}
              {/* Status dot */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-[oklch(0.16_0.035_250)] ${
                  personnel.status === "ACTIVE"
                    ? "bg-emerald-400"
                    : personnel.status === "INACTIVE"
                      ? "bg-amber-400"
                      : "bg-zinc-400"
                }`}
              />
            </div>

            {/* Name and metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 flex-wrap">
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                  {personnel.name}
                </h1>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge className={status.className}>{status.label}</Badge>
                  {po && (
                    <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                      PO
                    </Badge>
                  )}
                  {rc && (
                    <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30">
                      Recman
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-white/60 text-sm mt-1">
                {rc?.title || po?.jobTitle || personnel.role}
              </p>

              {/* Contact row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-white/50">
                {personnel.email && (
                  <a
                    href={`mailto:${personnel.email}`}
                    className="flex items-center gap-1.5 hover:text-white/80 transition-colors"
                  >
                    <Mail className="h-3 w-3" />
                    {personnel.email}
                  </a>
                )}
                {(personnel.phone || rc?.phone) && (
                  <a
                    href={`tel:${personnel.phone || rc?.phone}`}
                    className="flex items-center gap-1.5 hover:text-white/80 transition-colors"
                  >
                    <Phone className="h-3 w-3" />
                    {personnel.phone || rc?.phone}
                  </a>
                )}
                {rc?.mobilePhone && rc.mobilePhone !== rc.phone && (
                  <a
                    href={`tel:${rc.mobilePhone}`}
                    className="flex items-center gap-1.5 hover:text-white/80 transition-colors"
                  >
                    <Smartphone className="h-3 w-3" />
                    {rc.mobilePhone}
                  </a>
                )}
                {rc?.linkedIn && (
                  <a
                    href={rc.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-white/80 transition-colors"
                  >
                    <Linkedin className="h-3 w-3" />
                    LinkedIn
                  </a>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-white/10">
                {personnel.department && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                    <span className="text-xs text-white/70">
                      {personnel.department}
                    </span>
                  </div>
                )}
                {rc?.nationality && (
                  <div className="flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 text-white/40" />
                    <span className="text-xs text-white/70">
                      {rc.nationality}
                    </span>
                  </div>
                )}
                {rc && rc.rating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <RatingStars rating={rc.rating} />
                  </div>
                )}
                {avgScore && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-nrt-teal">
                      Snitt: {avgScore}/10
                    </span>
                    <span className="text-[10px] text-white/40">
                      ({personnel.evaluations.length} eval.)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          2. TWO-COLUMN LAYOUT
          ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.65fr] gap-6">
        {/* ─── LEFT COLUMN (wider) ─── */}
        <div className="space-y-6 stagger-in">
          {/* Om meg */}
          {rc?.description && (
            <Section>
              <SectionTitle
                icon={FileText}
                title="Om meg"
                iconColor="text-nrt-teal"
              />
              <Card>
                <CardContent className="px-5 py-4">
                  <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                    {rc.description}
                  </p>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Kurs og sertifiseringer */}
          {courses.length > 0 && (
            <Section>
              <SectionTitle
                icon={ShieldCheck}
                title="Kurs og sertifiseringer"
                count={courses.length}
                iconColor="text-emerald-600"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {courses.map((course, i) => {
                  const st = getCourseStatus(course);
                  const StatusIcon = st.icon;
                  return (
                    <div
                      key={course.courseId || `course-${i}`}
                      className={`rounded-xl border p-3.5 transition-all hover:shadow-sm ${st.color}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-snug truncate">
                            {course.name}
                          </p>
                          {course.description && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                              {course.description}
                            </p>
                          )}
                        </div>
                        <StatusIcon
                          className={`h-4 w-4 shrink-0 ${st.iconColor}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {course.issueDate && (
                          <span className="text-[10px] text-muted-foreground">
                            Utstedt: {formatDate(course.issueDate)}
                          </span>
                        )}
                        {course.expiryDate && (
                          <span className="text-[10px] text-muted-foreground">
                            Utl.: {formatDate(course.expiryDate)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge
                          className={`text-[10px] h-4 px-1.5 ${
                            st.iconColor === "text-emerald-600"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : st.iconColor === "text-amber-600"
                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                : st.iconColor === "text-red-600"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {st.label}
                        </Badge>
                        {course.verified && (
                          <Badge className="text-[10px] h-4 px-1.5 bg-blue-100 text-blue-700 border-blue-200">
                            Verifisert
                          </Badge>
                        )}
                      </div>
                      {course.files && course.files.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50">
                          {course.files.map((file, fi) => (
                            <a
                              key={file.fileId || fi}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <Paperclip className="h-2.5 w-2.5" />
                              {file.fileName}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Arbeidserfaring */}
          {experience.length > 0 && (
            <Section>
              <SectionTitle
                icon={Briefcase}
                title="Arbeidserfaring"
                count={experience.length}
                iconColor="text-slate-600"
              />
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {experience.map((exp, i) => (
                      <div key={i} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {exp.title && (
                              <p className="text-xs font-semibold">
                                {exp.title}
                              </p>
                            )}
                            {exp.company && (
                              <p className="text-xs text-muted-foreground">
                                {exp.company}
                                {exp.location && ` \u2014 ${exp.location}`}
                              </p>
                            )}
                          </div>
                          {(exp.startDate || exp.endDate) && (
                            <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                              {formatDate(exp.startDate)}
                              {" \u2013 "}
                              {exp.endDate ? formatDate(exp.endDate) : "nå"}
                            </span>
                          )}
                        </div>
                        {exp.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Prosjekterfaring */}
          {projectExperience.length > 0 && (
            <Section>
              <SectionTitle
                icon={FolderKanban}
                title="Prosjekterfaring"
                count={projectExperience.length}
                iconColor="text-indigo-600"
              />
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {projectExperience.map((proj, i) => (
                      <div key={proj.projectExperienceId || i} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-semibold min-w-0">
                            {proj.title || "Uten tittel"}
                          </p>
                          {(proj.startDate || proj.endDate) && (
                            <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                              {formatDate(proj.startDate)}
                              {" \u2013 "}
                              {proj.current === "true"
                                ? "pågår"
                                : proj.endDate
                                  ? formatDate(proj.endDate)
                                  : "\u2013"}
                            </span>
                          )}
                        </div>
                        {proj.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">
                            {proj.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Utdanning */}
          {education.length > 0 && (
            <Section>
              <SectionTitle
                icon={GraduationCap}
                title="Utdanning"
                count={education.length}
                iconColor="text-indigo-600"
              />
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {education.map((edu, i) => (
                      <div key={i} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {edu.institution && (
                              <p className="text-xs font-semibold">
                                {edu.institution}
                              </p>
                            )}
                            {edu.degree && (
                              <p className="text-xs text-muted-foreground">
                                {edu.degree}
                              </p>
                            )}
                          </div>
                          {(edu.startDate || edu.endDate) && (
                            <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                              {formatDate(edu.startDate)}
                              {" \u2013 "}
                              {edu.endDate ? formatDate(edu.endDate) : "\u2013"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Basisinformasjon & egendefinerte felter */}
          {categories.filter((c) => c.fields.length > 0).length > 0 && (
            <Section>
              <SectionTitle
                icon={ClipboardList}
                title="Egendefinerte felter"
                iconColor="text-muted-foreground"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories
                  .filter((c) => c.fields.length > 0)
                  .map((cat) => (
                    <Card key={cat.id}>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {cat.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 pt-0">
                        <div className="space-y-0.5">
                          {cat.fields.map((field) => {
                            const val = fieldValueMap[field.id];
                            const display =
                              field.type === "BOOLEAN"
                                ? val === "true"
                                  ? "Ja"
                                  : val === "false"
                                    ? "Nei"
                                    : "\u2013"
                                : val || "\u2013";
                            return (
                              <DataRow key={field.id} label={field.name}>
                                {display}
                              </DataRow>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </Section>
          )}
        </div>

        {/* ─── RIGHT COLUMN (narrower) ─── */}
        <div className="space-y-6 stagger-in">
          {/* Kontaktinfo */}
          {rc && (
            <Section>
              <SectionTitle
                icon={MapPin}
                title="Kontaktinfo"
                iconColor="text-nrt-teal"
              />
              <Card>
                <CardContent className="px-4 py-3">
                  <div className="space-y-0.5">
                    {rc.email && <DataRow label="E-post">{rc.email}</DataRow>}
                    {rc.phone && <DataRow label="Telefon">{rc.phone}</DataRow>}
                    {rc.mobilePhone && (
                      <DataRow label="Mobil">{rc.mobilePhone}</DataRow>
                    )}
                    {rc.address && (
                      <DataRow label="Adresse">{rc.address}</DataRow>
                    )}
                    {(rc.postalCode || rc.postalPlace) && (
                      <DataRow label="Poststed">
                        {[rc.postalCode, rc.postalPlace]
                          .filter(Boolean)
                          .join(" ")}
                      </DataRow>
                    )}
                    {rc.city && <DataRow label="By">{rc.city}</DataRow>}
                    {rc.country && (
                      <DataRow label="Land">{rc.country}</DataRow>
                    )}
                    {rc.nationality && (
                      <DataRow label="Nasjonalitet">
                        {rc.nationality}
                      </DataRow>
                    )}
                    {rc.gender && (
                      <DataRow label="Kjønn">{rc.gender}</DataRow>
                    )}
                    {rc.dob && (
                      <DataRow label="Født">{formatDate(rc.dob)}</DataRow>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Ferdigheter */}
          {skills.length > 0 && (
            <Section>
              <SectionTitle
                icon={Wrench}
                title="Ferdigheter"
                count={skills.length}
                iconColor="text-blue-600"
              />
              <Card>
                <CardContent className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill, i) => (
                      <Badge
                        key={`${skill.name}-${i}`}
                        className="bg-blue-100 text-blue-700 border-blue-200"
                      >
                        {skill.name}
                        {skill.level && (
                          <span className="ml-1 opacity-70">
                            ({skill.level})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Språk */}
          {languages.length > 0 && (
            <Section>
              <SectionTitle
                icon={Languages}
                title="Språk"
                count={languages.length}
                iconColor="text-purple-600"
              />
              <Card>
                <CardContent className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {languages.map((lang, i) => (
                      <Badge
                        key={`${lang.name}-${i}`}
                        className="bg-purple-100 text-purple-700 border-purple-200"
                      >
                        {lang.name}
                        {lang.level && (
                          <span className="ml-1 opacity-70">
                            ({lang.level})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Førerkort */}
          {driversLicense.length > 0 && (
            <Section>
              <SectionTitle
                icon={Car}
                title="Førerkort"
                count={driversLicense.length}
                iconColor="text-amber-600"
              />
              <Card>
                <CardContent className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {driversLicense.map((lic, i) => (
                      <Badge
                        key={`${lic}-${i}`}
                        className="bg-amber-100 text-amber-700 border-amber-200"
                      >
                        {lic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Pårørende */}
          {relatives.length > 0 && (
            <Section>
              <SectionTitle
                icon={Heart}
                title="Pårørende"
                count={relatives.length}
                iconColor="text-rose-500"
              />
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {relatives.map((rel, i) => (
                      <div
                        key={rel.relativeId || `rel-${i}`}
                        className="px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold">{rel.name}</p>
                          {rel.relation && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4 px-1.5"
                            >
                              {rel.relation}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {rel.email && (
                            <a
                              href={`mailto:${rel.email}`}
                              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {rel.email}
                            </a>
                          )}
                          {rel.mobilePhone && (
                            <a
                              href={`tel:${rel.mobilePhone}`}
                              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {rel.mobilePhone}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Referanser */}
          {references.length > 0 && (
            <Section>
              <SectionTitle
                icon={Users}
                title="Referanser"
                count={references.length}
                iconColor="text-slate-600"
              />
              <Card>
                <CardContent className="px-4 py-3">
                  <div className="space-y-2">
                    {references.map((ref, i) => (
                      <details key={i} className="group">
                        <summary className="cursor-pointer text-xs font-medium hover:text-foreground/80 list-none flex items-center gap-1.5">
                          <ChevronDown className="h-3 w-3 text-muted-foreground group-open:rotate-180 transition-transform" />
                          {ref.name ?? "Referanse"}
                          {ref.company && (
                            <span className="text-muted-foreground font-normal">
                              &mdash; {ref.company}
                            </span>
                          )}
                        </summary>
                        <div className="pl-5 mt-1.5 space-y-0.5">
                          {ref.phone && (
                            <p className="text-[10px] text-muted-foreground">
                              Telefon:{" "}
                              <span className="text-foreground">
                                {ref.phone}
                              </span>
                            </p>
                          )}
                          {ref.email && (
                            <p className="text-[10px] text-muted-foreground">
                              E-post:{" "}
                              <a
                                href={`mailto:${ref.email}`}
                                className="text-foreground underline underline-offset-2"
                              >
                                {ref.email}
                              </a>
                            </p>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Dokumenter */}
          {files.length > 0 && (
            <Section>
              <SectionTitle
                icon={Download}
                title="Dokumenter"
                count={files.length}
                iconColor="text-cyan-600"
              />
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {files.map((file, i) => (
                      <a
                        key={file.fileId || `file-${i}`}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {file.fileName || "Dokument"}
                          </p>
                          {file.category && (
                            <p className="text-[10px] text-muted-foreground">
                              {file.category}
                            </p>
                          )}
                        </div>
                        <Download className="h-3 w-3 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Ansettelsesinfo */}
          {(po || rc) && (
            <Section>
              <SectionTitle
                icon={Building2}
                title="Ansettelsesinfo"
                iconColor="text-blue-600"
              />
              <Card>
                <CardContent className="px-4 py-3">
                  <div className="space-y-0.5">
                    {rc?.employeeNumber && (
                      <DataRow label="Ansattnr">
                        {rc.employeeNumber}
                      </DataRow>
                    )}
                    {rc?.employeeStart && (
                      <DataRow label="Ansattstart">
                        {formatDate(rc.employeeStart)}
                      </DataRow>
                    )}
                    {rc?.employeeEnd && (
                      <DataRow label="Ansattslutt">
                        {formatDate(rc.employeeEnd)}
                      </DataRow>
                    )}
                    {po?.department && (
                      <DataRow label="PO Avdeling">
                        {po.department}
                      </DataRow>
                    )}
                    {po?.jobTitle && (
                      <DataRow label="PO Stilling">
                        {po.jobTitle}
                      </DataRow>
                    )}
                    <DataRow label="Rolle">{personnel.role}</DataRow>
                    {personnel.department && (
                      <DataRow label="Avdeling">
                        {personnel.department}
                      </DataRow>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Evalueringer — snitt-sammendrag med link */}
          {personnel.evaluations.length > 0 && (
            <Section>
              <SectionTitle
                icon={Star}
                title="Evalueringer"
                count={personnel.evaluations.length}
                iconColor="text-amber-500"
              />
              <Card>
                <CardContent className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold tabular-nums ${
                        Number(avgScore) >= 8 ? "text-emerald-600" :
                        Number(avgScore) >= 5 ? "text-amber-600" : "text-red-600"
                      }`}>
                        {avgScore}
                      </span>
                      <span className="text-sm text-muted-foreground">/10 snitt</span>
                    </div>
                    <Link
                      href="#evalueringer"
                      className="text-xs text-nrt-teal hover:underline"
                    >
                      Se alle →
                    </Link>
                  </div>
                  {/* Mini bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted mt-2">
                    <div
                      className={`h-1.5 rounded-full ${
                        Number(avgScore) >= 8 ? "bg-emerald-500" :
                        Number(avgScore) >= 5 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Number(avgScore) * 10}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </Section>
          )}

          {/* Notater (compact) */}
          {personnel.notes.length > 0 && (
            <Section>
              <SectionTitle
                icon={FileText}
                title="Notater"
                count={personnel.notes.length}
                iconColor="text-slate-500"
              />
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {personnel.notes.slice(0, 4).map((note) => (
                      <div key={note.id} className="px-4 py-2.5">
                        <p className="text-xs line-clamp-2 whitespace-pre-wrap">
                          {note.content}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {note.authorName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {note.createdAt.toLocaleDateString("nb-NO")}
                            </span>
                          </div>
                          <DeleteButton action={deleteNote.bind(null, note.id)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {personnel.notes.length > 4 && (
                    <div className="px-4 py-2 border-t text-center">
                      <span className="text-[10px] text-muted-foreground">
                        +{personnel.notes.length - 4} flere notater
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Section>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          3. FULL-WIDTH BOTTOM SECTIONS
          ═══════════════════════════════════════════════ */}

      {/* Evalueringer — full tabell (collapsible) */}
      {personnel.evaluations.length > 0 && (
        <Section>
          <div id="evalueringer" className="scroll-mt-6" />
          <details className="group" open>
            <summary className="cursor-pointer list-none">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-amber-500">
                  <Star className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-display text-sm font-semibold tracking-tight">
                  Alle evalueringer
                </h2>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {personnel.evaluations.length}
                </Badge>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform ml-auto" />
              </div>
            </summary>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Dato</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Evaluert av</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Score</th>
                      {EVALUATION_CRITERIA.map((c) => (
                        <th key={c.key} className="px-3 py-2.5 text-left text-[10px] font-medium text-muted-foreground hidden lg:table-cell">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Kommentar</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground" />
                    </tr>
                  </thead>
                  <tbody>
                    {personnel.evaluations.map((evaluation) => {
                      const customScores = (evaluation as unknown as Record<string, unknown>).criteriaScores as Record<string, number> | null;
                      const hasCustom = customScores && Object.keys(customScores).length > 0;
                      return (
                        <tr key={evaluation.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {evaluation.createdAt.toLocaleDateString("nb-NO")}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            {evaluation.evaluatorName}
                          </td>
                          <td className="px-4 py-2.5">
                            <ScoreBadge score={evaluation.score} />
                          </td>
                          {EVALUATION_CRITERIA.map((criterion) => {
                            const value = hasCustom
                              ? (customScores[criterion.label] ?? null)
                              : (evaluation[criterion.key as keyof typeof evaluation] as number);
                            return (
                              <td key={criterion.key} className="px-3 py-2.5 hidden lg:table-cell">
                                {value !== null && value !== undefined ? (
                                  <span className={`text-xs font-medium tabular-nums ${
                                    value >= 8 ? "text-emerald-600" :
                                    value >= 5 ? "text-amber-600" : "text-red-600"
                                  }`}>
                                    {value}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">–</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-2.5 hidden sm:table-cell max-w-[200px]">
                            {evaluation.comment ? (
                              <p className="text-[10px] text-muted-foreground line-clamp-2">
                                {evaluation.comment}
                              </p>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">–</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/evaluering/${evaluation.id}`}
                                className="text-[10px] text-nrt-teal hover:underline"
                              >
                                Detaljer
                              </Link>
                              <DeleteButton action={deleteEvaluation.bind(null, evaluation.id)} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </details>
        </Section>
      )}

      {/* Jobber & Ressursplan (collapsible) */}
      {(activeAssignments.length > 0 || jobsData.entries.length > 0) && (
        <Section>
          <details className="group" open>
            <summary className="cursor-pointer list-none">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-emerald-600">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-display text-sm font-semibold tracking-tight">
                  Jobber & Ressursplan
                </h2>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {activeAssignments.length}
                </Badge>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform ml-auto" />
              </div>
            </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Aktive jobber */}
            {activeAssignments.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                    <CardTitle className="text-xs font-semibold">
                      Aktive jobber
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {activeAssignments.map((assignment) => (
                      <div key={assignment.id} className="px-4 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <Link
                              href={`/jobber/${assignment.job.id}`}
                              className="text-xs font-medium hover:underline underline-offset-2"
                            >
                              {assignment.job.name}
                            </Link>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {assignment.job.project.name} &mdash;{" "}
                              {assignment.job.project.customer.name}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px]"
                          >
                            {assignment.job.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />
                            {assignment.job.location}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <CalendarDays className="h-2.5 w-2.5" />
                            {formatDate(assignment.startDate)}
                            {assignment.endDate
                              ? ` \u2013 ${formatDate(assignment.endDate)}`
                              : " \u2013"}
                          </span>
                          {assignment.rotationPattern && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <RotateCcw className="h-2.5 w-2.5" />
                              {assignment.rotationPattern.name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ressursplan */}
            {jobsData.entries.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
                    <CardTitle className="text-xs font-semibold">
                      Ressursplan
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {jobsData.entries.map((entry) => (
                      <div key={entry.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">
                            {entry.displayName}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {entry.resourcePlan.name} (
                            {entry.resourcePlan.year})
                          </span>
                        </div>
                        {(entry.crew || entry.location) && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {[entry.crew, entry.location]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                        )}
                        {entry.allocations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {entry.allocations.map((alloc) => (
                              <Badge
                                key={alloc.id}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {alloc.label}: {formatDate(alloc.startDate)}{" "}
                                \u2013 {formatDate(alloc.endDate)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          </details>
        </Section>
      )}

      {/* Synk-status (collapsible) */}
      {(po || rc) && (
        <Section>
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-muted-foreground">
                  <Cloud className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-display text-sm font-semibold tracking-tight">
                  Synk-status
                </h2>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
              </div>
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* PowerOffice */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-3.5 w-3.5 text-blue-600" />
                    <CardTitle className="text-xs font-semibold">
                      PowerOffice Go
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  {po ? (
                    <div className="space-y-0.5">
                      <DataRow label="Navn">
                        {po.firstName} {po.lastName}
                      </DataRow>
                      <DataRow label="E-post">{po.email ?? "\u2013"}</DataRow>
                      <DataRow label="Telefon">
                        {po.phone ?? "\u2013"}
                      </DataRow>
                      <DataRow label="Avdeling">
                        {po.department ?? "\u2013"}
                      </DataRow>
                      <DataRow label="Stilling">
                        {po.jobTitle ?? "\u2013"}
                      </DataRow>
                      <DataRow label="Status">
                        <Badge
                          className={
                            po.isActive
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-red-100 text-red-700 border-red-200"
                          }
                        >
                          {po.isActive ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </DataRow>
                      <div className="pt-1.5 mt-1.5 border-t">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <RefreshCw className="h-2.5 w-2.5" />
                          Sist synket: {formatDateTime(po.lastSyncedAt)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-3 text-center">
                      Ikke koblet til PowerOffice
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recman */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-3.5 w-3.5 text-emerald-600" />
                    <CardTitle className="text-xs font-semibold">
                      Recman
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  {rc ? (
                    <div className="space-y-0.5">
                      <DataRow label="Navn">
                        {rc.firstName} {rc.lastName}
                      </DataRow>
                      <DataRow label="E-post">{rc.email ?? "\u2013"}</DataRow>
                      <DataRow label="Tittel">
                        {rc.title ?? "\u2013"}
                      </DataRow>
                      <DataRow label="Ansattnr">
                        {rc.employeeNumber ?? "\u2013"}
                      </DataRow>
                      <DataRow label="Rating">
                        <RatingStars rating={rc.rating} />
                      </DataRow>
                      <div className="pt-1.5 mt-1.5 border-t">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <RefreshCw className="h-2.5 w-2.5" />
                          Sist synket: {formatDateTime(rc.lastSyncedAt)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-3 text-center">
                      Ikke koblet til Recman
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </details>
        </Section>
      )}
    </div>
  );
}
