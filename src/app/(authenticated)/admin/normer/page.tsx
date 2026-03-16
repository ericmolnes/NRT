import { isAdmin } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NormAdminPanel } from "@/components/estimering/norm-admin-panel";

export default async function NormerAdminPage() {
  if (!(await isAdmin())) redirect("/dashboard");

  const [normCategories, recentLogs, normStats] = await Promise.all([
    db.normCategory.findMany({
      include: {
        norms: { orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    db.normUpdateLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Hent statistikk for normer med faktisk data
    db.actualTimeEntry.groupBy({
      by: ["normId"],
      where: { normId: { not: null } },
      _count: true,
      _avg: { actualHours: true, estimatedHours: true },
    }),
  ]);

  // Map normStats til et lettere format
  const statsMap = new Map(
    normStats
      .filter((s) => s.normId)
      .map((s) => [
        s.normId!,
        {
          dataPoints: s._count,
          avgActual: s._avg.actualHours || 0,
          avgEstimated: s._avg.estimatedHours || 0,
        },
      ])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Normer og arbeidstidssatser
        </h1>
        <p className="text-muted-foreground">
          Administrer arbeidsnormer og se statistikk fra utforte prosjekter.
        </p>
      </div>

      <NormAdminPanel
        normCategories={normCategories}
        recentLogs={recentLogs}
        statsMap={Object.fromEntries(statsMap)}
      />
    </div>
  );
}
