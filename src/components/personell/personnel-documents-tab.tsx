"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  FileUp,
  Pencil,
  ShieldCheck,
  ShieldQuestion,
  X,
} from "lucide-react";
import {
  approvePersonnelCourseRecord,
  correctPersonnelCourseRecord,
  rejectPersonnelCourseRecord,
  uploadPersonnelDocument,
  type ActionState,
} from "@/app/(authenticated)/personell/[id]/actions";

type PersonnelDocument = {
  id: string;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedByName: string;
  uploadedAt: Date;
  parserStatus: string;
  parserSummary: string | null;
};

type PersonnelCourseRecord = {
  id: string;
  documentId: string | null;
  name: string;
  issuer: string | null;
  certificateNumber: string | null;
  issueDate: Date | string | null;
  expiryDate: Date | string | null;
  status: string;
  source: string;
  aiConfidence: number | null;
  rejectionReason: string | null;
  createdByName: string;
  approvedByName: string | null;
  approvedAt: Date | null;
  rejectedByName: string | null;
  rejectedAt: Date | null;
  createdAt: Date;
};

type Props = {
  personnelId: string;
  documents: PersonnelDocument[];
  courseRecords: PersonnelCourseRecord[];
};

export function PersonnelDocumentsTab({
  personnelId,
  documents,
  courseRecords,
}: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadState, uploadAction, uploadPending] = useActionState<
    ActionState,
    FormData
  >(uploadPersonnelDocument, {});
  const [approveState, approveAction, approvePending] = useActionState<
    ActionState,
    FormData
  >(approvePersonnelCourseRecord, {});
  const [correctState, correctAction, correctPending] = useActionState<
    ActionState,
    FormData
  >(correctPersonnelCourseRecord, {});
  const [rejectState, rejectAction, rejectPending] = useActionState<
    ActionState,
    FormData
  >(rejectPersonnelCourseRecord, {});

  const suggestions = courseRecords.filter((record) => record.status === "SUGGESTED");
  const approved = courseRecords.filter((record) => record.status === "APPROVED");
  const rejected = courseRecords.filter((record) => record.status === "REJECTED");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {documents.length} dokumenter
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {suggestions.length} forslag
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
            {approved.length} godkjent
          </Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUpload((value) => !value)}
        >
          {showUpload ? <X /> : <FileUp />}
          {showUpload ? "Lukk" : "Last opp"}
        </Button>
      </div>

      {showUpload && (
        <Card>
          <CardContent className="p-4">
            <form action={uploadAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <input type="hidden" name="personnelId" value={personnelId} />
              <div className="space-y-1">
                <label className="text-xs font-medium" htmlFor="personnel-document-file">
                  Dokument
                </label>
                <Input id="personnel-document-file" name="file" type="file" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" htmlFor="personnel-document-text">
                  Tekstutdrag
                </label>
                <Textarea
                  id="personnel-document-text"
                  name="documentText"
                  rows={1}
                  className="min-h-8"
                />
              </div>
              <Button type="submit" size="sm" disabled={uploadPending}>
                <FileUp />
                {uploadPending ? "Lagrer" : "Lagre"}
              </Button>
            </form>
            {uploadState.message && (
              <p className={`mt-2 text-xs ${uploadState.success ? "text-emerald-600" : "text-destructive"}`}>
                {uploadState.message}
              </p>
            )}
            {uploadState.errors?.file && (
              <p className="mt-2 text-xs text-destructive">
                {uploadState.errors.file[0]}
              </p>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground">
              Filen lagres som metadata her. Legg inn tekstutdrag for bedre kursforslag.
            </p>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldQuestion className="h-3.5 w-3.5 text-amber-600" />
              <CardTitle className="text-xs font-semibold">
                Kursforslag
              </CardTitle>
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {suggestions.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {suggestions.map((record) => (
                <CourseSuggestionRow
                  key={record.id}
                  personnelId={personnelId}
                  record={record}
                  approveAction={approveAction}
                  correctAction={correctAction}
                  rejectAction={rejectAction}
                  approvePending={approvePending}
                  correctPending={correctPending}
                  rejectPending={rejectPending}
                  correctState={correctState}
                  rejectState={rejectState}
                />
              ))}
            </div>
            {(approveState.message || correctState.message || rejectState.message) && (
              <div className="border-t px-4 py-2 text-xs text-muted-foreground">
                {approveState.message ?? correctState.message ?? rejectState.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <CardTitle className="text-xs font-semibold">
              Kursregister
            </CardTitle>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {approved.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {approved.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Ingen godkjente kurs.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground">Kurs</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">Utsteder</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">Gyldig til</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">Kilde</th>
                  </tr>
                </thead>
                <tbody>
                  {approved.map((record) => (
                    <tr key={record.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2 text-xs font-medium">{record.name}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{record.issuer ?? "-"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(record.expiryDate)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {record.source === "AI" ? "AI" : "Manuell"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-xs font-semibold">Dokumenthistorikk</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Ingen dokumenter lagret.
            </p>
          ) : (
            <div className="divide-y">
              {documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{document.fileName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {document.uploadedByName} · {formatDate(document.uploadedAt)} · {formatBytes(document.sizeBytes)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {parserStatusLabel(document.parserStatus)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {rejected.length > 0 && (
            <div className="border-t px-4 py-2 text-[10px] text-muted-foreground">
              {rejected.length} avviste forslag beholdes i auditloggen.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CourseSuggestionRow({
  personnelId,
  record,
  approveAction,
  correctAction,
  rejectAction,
  approvePending,
  correctPending,
  rejectPending,
  correctState,
  rejectState,
}: {
  personnelId: string;
  record: PersonnelCourseRecord;
  approveAction: (formData: FormData) => void;
  correctAction: (formData: FormData) => void;
  rejectAction: (formData: FormData) => void;
  approvePending: boolean;
  correctPending: boolean;
  rejectPending: boolean;
  correctState: ActionState;
  rejectState: ActionState;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-xs font-semibold">{record.name}</p>
            {record.aiConfidence !== null && (
              <Badge variant="outline" className="text-[10px]">
                {Math.round(record.aiConfidence * 100)}%
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {[record.issuer, record.certificateNumber, formatDate(record.expiryDate)]
              .filter((value) => value && value !== "-")
              .join(" · ") || "Ingen detaljer"}
          </p>
        </div>
        <form action={approveAction}>
          <input type="hidden" name="personnelId" value={personnelId} />
          <input type="hidden" name="id" value={record.id} />
          <Button type="submit" size="xs" disabled={approvePending}>
            <Check />
            Godkjenn
          </Button>
        </form>
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <details className="rounded-lg border bg-muted/20">
          <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-[10px] font-medium">
            <Pencil className="h-3 w-3" />
            Korriger
          </summary>
          <form action={correctAction} className="grid gap-2 border-t p-3">
            <input type="hidden" name="personnelId" value={personnelId} />
            <input type="hidden" name="id" value={record.id} />
            <Input name="name" defaultValue={record.name} required className="h-7 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <Input name="issuer" defaultValue={record.issuer ?? ""} className="h-7 text-xs" />
              <Input name="certificateNumber" defaultValue={record.certificateNumber ?? ""} className="h-7 text-xs" />
              <Input name="issueDate" type="date" defaultValue={formatInputDate(record.issueDate)} className="h-7 text-xs" />
              <Input name="expiryDate" type="date" defaultValue={formatInputDate(record.expiryDate)} className="h-7 text-xs" />
            </div>
            <Button type="submit" size="xs" disabled={correctPending}>
              <Check />
              Lagre
            </Button>
            {correctState.errors?.name && (
              <p className="text-[10px] text-destructive">
                {correctState.errors.name[0]}
              </p>
            )}
          </form>
        </details>
        <details className="rounded-lg border bg-muted/20">
          <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-[10px] font-medium">
            <X className="h-3 w-3" />
            Avvis
          </summary>
          <form action={rejectAction} className="flex gap-2 border-t p-3">
            <input type="hidden" name="personnelId" value={personnelId} />
            <input type="hidden" name="id" value={record.id} />
            <Input name="reason" placeholder="Begrunnelse" className="h-7 text-xs" />
            <Button type="submit" variant="destructive" size="xs" disabled={rejectPending}>
              <X />
              Avvis
            </Button>
            {rejectState.errors?.reason && (
              <p className="text-[10px] text-destructive">
                {rejectState.errors.reason[0]}
              </p>
            )}
          </form>
        </details>
      </div>
    </div>
  );
}

function formatDate(value: Date | string | null): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("nb-NO");
}

function formatInputDate(value: Date | string | null): string {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatBytes(value: number | null): string {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} kB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function parserStatusLabel(status: string): string {
  switch (status) {
    case "SUGGESTIONS_CREATED":
      return "Forslag";
    case "NO_SUGGESTIONS":
      return "Ingen forslag";
    case "FAILED":
      return "Feilet";
    default:
      return "Ikke kjort";
  }
}
