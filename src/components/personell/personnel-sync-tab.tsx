import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, RefreshCw, Star } from "lucide-react";

interface PersonnelSyncTabProps {
  personnelId: string;
  poEmployee: {
    id: string;
    poId: bigint;
    code: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    department: string | null;
    jobTitle: string | null;
    isActive: boolean;
    lastSyncedAt: Date;
  } | null;
  recmanCandidate: {
    id: string;
    recmanId: string;
    firstName: string;
    lastName: string;
    email: string | null;
    title: string | null;
    isEmployee: boolean;
    employeeNumber: number | null;
    employeeStart: Date | null;
    employeeEnd: Date | null;
    rating: number;
    lastSyncedAt: Date;
  } | null;
}

function formatDate(date: Date | null): string {
  if (!date) return "–";
  return new Date(date).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(date: Date | null): string {
  if (!date) return "–";
  return new Date(date).toLocaleDateString("nb-NO");
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </span>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right truncate">{children}</span>
    </div>
  );
}

export function PersonnelSyncTab({
  poEmployee,
  recmanCandidate,
}: PersonnelSyncTabProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* PowerOffice Go */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm">PowerOffice Go</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          {poEmployee ? (
            <div className="space-y-1">
              <DataRow label="Navn">
                {poEmployee.firstName} {poEmployee.lastName}
              </DataRow>
              <DataRow label="E-post">{poEmployee.email ?? "–"}</DataRow>
              <DataRow label="Telefon">{poEmployee.phone ?? "–"}</DataRow>
              <DataRow label="Avdeling">{poEmployee.department ?? "–"}</DataRow>
              <DataRow label="Stilling">{poEmployee.jobTitle ?? "–"}</DataRow>
              <DataRow label="Kode">{poEmployee.code ?? "–"}</DataRow>
              <DataRow label="Status">
                <Badge
                  className={
                    poEmployee.isActive
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-red-100 text-red-700 border-red-200"
                  }
                >
                  {poEmployee.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
              </DataRow>
              <div className="pt-1.5 mt-1.5 border-t">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <RefreshCw className="h-2.5 w-2.5" />
                  Sist synket: {formatDate(poEmployee.lastSyncedAt)}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground">
                Ikke koblet til PowerOffice
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recman */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm">Recman</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          {recmanCandidate ? (
            <div className="space-y-1">
              <DataRow label="Navn">
                {recmanCandidate.firstName} {recmanCandidate.lastName}
              </DataRow>
              <DataRow label="E-post">{recmanCandidate.email ?? "–"}</DataRow>
              <DataRow label="Tittel">{recmanCandidate.title ?? "–"}</DataRow>
              <DataRow label="Ansattnr">
                {recmanCandidate.employeeNumber ?? "–"}
              </DataRow>
              <DataRow label="Ansattstart">
                {formatDateShort(recmanCandidate.employeeStart)}
              </DataRow>
              {recmanCandidate.employeeEnd && (
                <DataRow label="Ansattslutt">
                  {formatDateShort(recmanCandidate.employeeEnd)}
                </DataRow>
              )}
              <DataRow label="Rating">
                <RatingStars rating={recmanCandidate.rating} />
              </DataRow>
              <div className="pt-1.5 mt-1.5 border-t">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <RefreshCw className="h-2.5 w-2.5" />
                  Sist synket: {formatDate(recmanCandidate.lastSyncedAt)}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground">
                Ikke koblet til Recman
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
