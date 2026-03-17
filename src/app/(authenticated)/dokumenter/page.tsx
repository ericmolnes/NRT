import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDocumentList, getDocumentStats, getDocumentsNeedingReview } from "@/lib/queries/documents";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentListFilters } from "@/components/dokumenter/document-list-filters";
import { DocumentCategoryBadge, VersionStatusBadge } from "@/components/dokumenter/document-status-badge";
import {
  FileCheck,
  FileText,
  ClipboardList,
  AlertCircle,
  Plus,
  Layers,
  Truck,
  Calendar,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
  }>;
}

export default async function DokumenterPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const [documents, stats, needingReview] = await Promise.all([
    getDocumentList(params.search, params.category),
    getDocumentStats(),
    getDocumentsNeedingReview(),
  ]);

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dokumentkontroll
          </h1>
          <p className="text-muted-foreground">
            Dokumentregister med versjonskontroll og godkjenning
          </p>
        </div>
        <Button render={<Link href="/dokumenter/ny" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nytt dokument
        </Button>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="stagger-in grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Aktive dokumenter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prosedyrer</CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.procedures}</div>
            <p className="text-xs text-muted-foreground">Registrerte prosedyrer</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instrukser</CardTitle>
            <FileCheck className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">{stats.workInstructions}</div>
            <p className="text-xs text-muted-foreground">Arbeidsinstrukser</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trenger revisjon</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.needingReview}</div>
            <p className="text-xs text-muted-foreground">Forfalt revisjonsdato</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Review alerts ─── */}
      {needingReview.length > 0 && (
        <Card className="border-red-200/50 bg-red-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold text-red-700">
                Dokumenter som trenger revisjon
              </h3>
            </div>
            <div className="space-y-1">
              {needingReview.slice(0, 5).map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dokumenter/${doc.id}`}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-red-100/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-red-600">
                      {doc.docNumber}
                    </span>
                    <span className="text-xs">{doc.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-red-500">
                      {doc.responsibleName}
                    </span>
                    <span className="text-[10px] text-red-500 tabular-nums">
                      {doc.nextReviewDate
                        ? new Date(doc.nextReviewDate).toLocaleDateString("nb-NO")
                        : ""}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Filters ─── */}
      <DocumentListFilters />

      {/* ─── Table ─── */}
      <div className="stagger-in">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Dokument</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 hidden md:table-cell">Ansvarlig</th>
                  <th className="px-4 py-3 text-center">Versjon</th>
                  <th className="px-4 py-3 text-center hidden lg:table-cell">Leverandører</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Neste revisjon</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {documents.map((doc) => {
                  const currentVersion = doc.versions[0];
                  return (
                    <tr
                      key={doc.id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dokumenter/${doc.id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.16_0.035_250)]/10">
                            <FileText className="h-4 w-4 text-[oklch(0.16_0.035_250)]" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-foreground group-hover:text-primary truncate block">
                              {doc.title}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {doc.docNumber}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <DocumentCategoryBadge category={doc.category} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {doc.responsibleName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Layers className="h-3 w-3" />
                          v{currentVersion?.versionNumber ?? 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        {doc._count.supplierLinks > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Truck className="h-3 w-3" />
                            {doc._count.supplierLinks}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">\u2013</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground tabular-nums">
                        {doc.nextReviewDate
                          ? new Date(doc.nextReviewDate).toLocaleDateString("nb-NO")
                          : "\u2013"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {currentVersion && (
                          <VersionStatusBadge status={currentVersion.status} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {documents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Ingen dokumenter funnet
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
