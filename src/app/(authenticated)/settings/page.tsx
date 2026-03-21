import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getAiModel } from "@/lib/ai/get-ai-model";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SyncButton } from "@/components/poweroffice/sync-button";
import { SyncButton as RecmanSyncButton } from "@/components/recman/sync-button";
import { AiModelSetting } from "@/components/settings/ai-model-setting";
import { saveAiModel } from "./actions";
import {
  User,
  Shield,
  Database,
  Users,
  Building,
  FolderKanban,
  Calculator,
  Briefcase,
  Cloud,
  RefreshCw,
  Bot,
} from "lucide-react";

export default async function SettingsPage() {
  const [session, admin] = await Promise.all([auth(), isAdmin()]);
  const user = session?.user;

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "?";

  // System stats (for admin)
  const stats = admin
    ? await Promise.all([
        db.personnel.count(),
        db.personnel.count({ where: { status: "ACTIVE" } }),
        db.customer.count(),
        db.project.count(),
        db.estimate.count(),
        db.job.count(),
        db.pOEmployee.count(),
        db.recmanCandidate.count({ where: { isEmployee: true } }),
      ]).then(
        ([
          personnel,
          activePersonnel,
          customers,
          projects,
          estimates,
          jobs,
          poEmployees,
          recmanEmployees,
        ]) => ({
          personnel,
          activePersonnel,
          customers,
          projects,
          estimates,
          jobs,
          poEmployees,
          recmanEmployees,
        })
      )
    : null;

  // Current AI model
  const currentAiModel = admin ? await getAiModel() : null;

  // Latest sync logs
  const syncLogs = admin
    ? await Promise.all([
        db.pOSyncLog.findFirst({
          orderBy: { startedAt: "desc" },
          select: { status: true, completedAt: true, recordsSynced: true },
        }),
        db.recmanSyncLog.findFirst({
          orderBy: { startedAt: "desc" },
          select: { status: true, completedAt: true, recordsSynced: true },
        }),
      ]).then(([po, recman]) => ({ po, recman }))
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Innstillinger
        </h1>
        <p className="text-muted-foreground">
          Kontoinformasjon og systemadministrasjon.
        </p>
      </div>

      {/* ─── Profil ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-nrt-teal" />
          <h2
            className="text-sm font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Profil
          </h2>
        </div>
        <Card>
          <CardContent className="flex items-center gap-5 p-5">
            <div className="w-16 h-16 rounded-full bg-[oklch(0.16_0.035_250)] flex items-center justify-center shrink-0">
              <span
                className="text-lg font-bold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {initials}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {admin ? (
                  <Badge className="bg-red-100 text-red-700 border-red-200">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary">Bruker</Badge>
                )}
                {user?.groups && user.groups.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {user.groups.length} gruppe
                    {user.groups.length !== 1 ? "r" : ""}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── Admin: Synkronisering ─── */}
      {admin && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-blue-600" />
            <h2
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Synkronisering
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold">
                    PowerOffice Go
                  </CardTitle>
                  <SyncButton resource="all" label="Synk" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    {syncLogs?.po ? (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          syncLogs.po.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : syncLogs.po.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {syncLogs.po.status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        Aldri synket
                      </span>
                    )}
                  </div>
                  {syncLogs?.po?.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sist synket</span>
                      <span>
                        {new Date(syncLogs.po.completedAt).toLocaleString(
                          "nb-NO"
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Ansatte i PO
                    </span>
                    <span>{stats?.poEmployees ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold">
                    Recman
                  </CardTitle>
                  <RecmanSyncButton />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    {syncLogs?.recman ? (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          syncLogs.recman.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : syncLogs.recman.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {syncLogs.recman.status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        Aldri synket
                      </span>
                    )}
                  </div>
                  {syncLogs?.recman?.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sist synket</span>
                      <span>
                        {new Date(
                          syncLogs.recman.completedAt
                        ).toLocaleString("nb-NO")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Ansatte i Recman
                    </span>
                    <span>{stats?.recmanEmployees ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ─── Admin: AI-modell ─── */}
      {admin && currentAiModel && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-600" />
            <h2
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              AI-modell
            </h2>
          </div>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-semibold">
                Modell for kandidat-matching
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-xs text-muted-foreground mb-3">
                Velg hvilken Claude-modell som brukes til AI-matching ved import av kandidater.
              </p>
              <AiModelSetting currentModel={currentAiModel} onSave={saveAiModel} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* ─── Admin: Systemoversikt ─── */}
      {admin && stats && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <h2
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Systemoversikt
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Personell",
                value: stats.personnel,
                sub: `${stats.activePersonnel} aktive`,
                icon: Users,
                color: "text-nrt-teal",
              },
              {
                label: "Kunder",
                value: stats.customers,
                icon: Building,
                color: "text-blue-600",
              },
              {
                label: "Prosjekter",
                value: stats.projects,
                icon: FolderKanban,
                color: "text-indigo-600",
              },
              {
                label: "Estimater",
                value: stats.estimates,
                icon: Calculator,
                color: "text-nrt-orange",
              },
              {
                label: "Jobber",
                value: stats.jobs,
                icon: Briefcase,
                color: "text-emerald-600",
              },
              {
                label: "PO Ansatte",
                value: stats.poEmployees,
                icon: Cloud,
                color: "text-blue-500",
              },
              {
                label: "Recman Ansatte",
                value: stats.recmanEmployees,
                icon: Cloud,
                color: "text-emerald-500",
              },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </span>
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                  </div>
                  <p
                    className="text-xl font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {item.value}
                  </p>
                  {item.sub && (
                    <p className="text-[10px] text-muted-foreground">
                      {item.sub}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ─── Om systemet ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2
            className="text-sm font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Om systemet
          </h2>
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plattform</span>
                <span>NRT Internal Tools</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versjon</span>
                <span>0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Framework</span>
                <span>Next.js 16</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Database</span>
                <span>Neon PostgreSQL</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
