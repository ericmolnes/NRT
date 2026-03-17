import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getDocumentById } from "@/lib/queries/documents";
import { isAdmin } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentCategoryBadge } from "@/components/dokumenter/document-status-badge";
import { DocumentDetailTabs } from "@/components/dokumenter/document-detail-tabs";
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  RefreshCw,
  Hash,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

function SectionTitle({
  icon: Icon,
  title,
  iconColor = "text-nrt-teal",
}: {
  icon: React.ElementType;
  title: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`flex items-center justify-center w-7 h-7 rounded-lg bg-muted ${iconColor}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h2 className="font-display text-sm font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right truncate">{children}</span>
    </div>
  );
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user) redirect("/login");

  const doc = await getDocumentById(id);
  if (!doc) notFound();

  const admin = await isAdmin();
  const currentVersion = doc.versions.find((v) => v.isCurrent);

  return (
    <div className="stagger-in space-y-6 pb-12">
      {/* ═══════════════════════════════════════════
          HERO HEADER
          ═══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-[oklch(0.16_0.035_250)] text-white noise-texture">
        <div className="relative z-10 p-6 sm:p-8">
          <div className="absolute top-4 left-4">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-white/60 hover:text-white hover:bg-white/10"
              render={<Link href="/dokumenter" />}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6 pt-6 sm:pt-2">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-2 ring-white/20 bg-[oklch(0.25_0.04_250)] flex items-center justify-center">
                <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-white/80" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {doc.title}
                </h1>
                <DocumentCategoryBadge category={doc.category} />
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm text-white/70">
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <Hash className="h-3.5 w-3.5" />
                  {doc.docNumber}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {doc.responsibleName}
                </span>
                {currentVersion && (
                  <span className="inline-flex items-center gap-1.5">
                    v{currentVersion.versionNumber} — {currentVersion.status}
                  </span>
                )}
                {doc.nextReviewDate && (
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      new Date(doc.nextReviewDate) < new Date()
                        ? "text-red-300"
                        : "text-white/70"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Revisjon: {new Date(doc.nextReviewDate).toLocaleDateString("nb-NO")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          TWO-COLUMN LAYOUT
          ═══════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left column — Tabs */}
        <div>
          <DocumentDetailTabs
            doc={{
              id: doc.id,
              docNumber: doc.docNumber,
              versions: doc.versions.map((v) => ({
                ...v,
                createdAt: v.createdAt,
                approvedAt: v.approvedAt,
              })),
              supplierLinks: doc.supplierLinks.map((l) => ({
                ...l,
                supplier: l.supplier,
              })),
              auditLog: doc.auditLog.map((l) => ({
                ...l,
                createdAt: l.createdAt,
              })),
              isAdmin: admin,
            }}
          />
        </div>

        {/* Right column — Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-1">
              <SectionTitle icon={FileText} title="Dokumentinfo" />
              <div className="divide-y">
                <DataRow label="Dok.nr">{doc.docNumber}</DataRow>
                <DataRow label="Tittel">{doc.title}</DataRow>
                <DataRow label="Kategori">
                  <DocumentCategoryBadge category={doc.category} />
                </DataRow>
                <DataRow label="Ansvarlig">{doc.responsibleName}</DataRow>
                <DataRow label="Revisjonssyklus">
                  {doc.reviewCycleMonths ? `${doc.reviewCycleMonths} mnd` : "\u2013"}
                </DataRow>
                <DataRow label="Neste revisjon">
                  {doc.nextReviewDate
                    ? new Date(doc.nextReviewDate).toLocaleDateString("nb-NO")
                    : "\u2013"}
                </DataRow>
                <DataRow label="Opprettet">
                  {new Date(doc.createdAt).toLocaleDateString("nb-NO")}
                </DataRow>
                <DataRow label="Opprettet av">{doc.createdByName}</DataRow>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-1">
              <SectionTitle icon={RefreshCw} title="Versjonssammendrag" />
              <div className="divide-y">
                <DataRow label="Totalt versjoner">{doc.versions.length}</DataRow>
                <DataRow label="Gjeldende">
                  {currentVersion ? `v${currentVersion.versionNumber}` : "Ingen"}
                </DataRow>
                <DataRow label="Godkjente">
                  {doc.versions.filter((v) => v.status === "APPROVED").length}
                </DataRow>
                <DataRow label="Utkast">
                  {doc.versions.filter((v) => v.status === "DRAFT").length}
                </DataRow>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
