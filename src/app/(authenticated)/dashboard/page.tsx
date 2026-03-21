import { auth } from "@/lib/auth";
import { getPersonnelStats } from "@/lib/queries/personnel";
import { getEvaluationStats } from "@/lib/queries/evaluations";
import { getEstimateStats } from "@/lib/queries/estimates";
import { getCustomerStats } from "@/lib/queries/customers";
import {
  Users,
  ClipboardCheck,
  Calculator,
  Building,
  ArrowUpRight,
  TrendingUp,
  CalendarRange,
  FileText,
  FolderKanban,
  Briefcase,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { categories, getToolsByCategory } from "@/lib/tools-registry";

export default async function DashboardPage() {
  const [session, personnelStats, evaluationStats, estimateStats, customerStats] =
    await Promise.all([
      auth(),
      getPersonnelStats(),
      getEvaluationStats(),
      getEstimateStats(),
      getCustomerStats(),
    ]);

  const firstName = session?.user?.name?.split(" ")[0] ?? "bruker";
  const hour = new Date().getHours();
  const greeting =
    hour < 6
      ? "God natt"
      : hour < 12
        ? "God morgen"
        : hour < 18
          ? "God ettermiddag"
          : "God kveld";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-[oklch(0.16_0.035_250)] px-8 py-10">
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(oklch(0.89 0.17 178 / 50%) 1px, transparent 1px),
              linear-gradient(90deg, oklch(0.89 0.17 178 / 50%) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.89 0.17 178 / 12%), transparent 70%)",
          }}
        />
        <div className="relative">
          <p className="text-sm font-medium text-[oklch(0.89_0.17_178)]">
            {greeting},
          </p>
          <h1
            className="mt-1 text-3xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {firstName}
          </h1>
          <p className="mt-2 text-sm text-[oklch(0.58_0.015_250)]">
            Her er en oversikt over plattformen din.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stagger-in grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Personell"
          value={personnelStats.total}
          subtitle={`${personnelStats.active} aktive`}
          icon={Users}
          href="/personell"
          accent="teal"
        />
        <KpiCard
          title="Evalueringer"
          value={evaluationStats.totalEvaluations}
          subtitle={
            evaluationStats.averageScore
              ? `Snitt: ${evaluationStats.averageScore.toFixed(1)}`
              : "Ingen evalueringer ennå"
          }
          icon={ClipboardCheck}
          href="/evaluering"
          accent="blue"
        />
        <KpiCard
          title="Estimater"
          value={estimateStats.total}
          subtitle={`${estimateStats.draft} utkast · ${estimateStats.approved} godkjent`}
          icon={Calculator}
          href="/estimering"
          accent="orange"
        />
        <KpiCard
          title="Kunder"
          value={customerStats.total}
          subtitle={`${customerStats.active} aktive`}
          icon={Building}
          href="/kunder"
          accent="steel"
        />
      </div>

      {/* Quick Access Grid */}
      <div>
        <h2
          className="mb-4 text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Verktøy
        </h2>
        <div className="stagger-in grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const categoryTools = getToolsByCategory(category.id);
            if (categoryTools.length === 0) return null;
            return categoryTools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.url}
                className="group card-hover flex items-center gap-4 rounded-xl border bg-card p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-[oklch(0.89_0.17_178_/_10%)] group-hover:text-[oklch(0.89_0.17_178)]">
                  <tool.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{tool.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {tool.description}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </Link>
            ));
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── KPI Card Component ─── */

const accentColors = {
  teal: {
    iconBg: "bg-[oklch(0.89_0.17_178_/_10%)]",
    iconText: "text-[oklch(0.89_0.17_178)]",
    glow: "oklch(0.89 0.17 178 / 6%)",
  },
  blue: {
    iconBg: "bg-[oklch(0.58_0.18_240_/_10%)]",
    iconText: "text-[oklch(0.58_0.18_240)]",
    glow: "oklch(0.58 0.18 240 / 6%)",
  },
  orange: {
    iconBg: "bg-[oklch(0.72_0.18_55_/_10%)]",
    iconText: "text-[oklch(0.72_0.18_55)]",
    glow: "oklch(0.72 0.18 55 / 6%)",
  },
  steel: {
    iconBg: "bg-[oklch(0.55_0.02_250_/_10%)]",
    iconText: "text-[oklch(0.55_0.02_250)]",
    glow: "oklch(0.55 0.02 250 / 6%)",
  },
} as const;

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  accent,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  accent: keyof typeof accentColors;
}) {
  const colors = accentColors[accent];

  return (
    <Link
      href={href}
      className="group card-hover relative overflow-hidden rounded-xl border bg-card p-5"
    >
      {/* Corner glow */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle, ${colors.glow}, transparent 70%)`,
        }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p
            className="mt-2 text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.iconBg} ${colors.iconText}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Arrow indicator */}
      <div className="absolute bottom-4 right-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1">
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
