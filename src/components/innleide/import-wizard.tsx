"use client";

import { useState, useRef, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  X,
} from "lucide-react";
import type { ParsedRow, MatchEntry } from "@/lib/ai/match-candidates";
import {
  parseExcelFile,
  runAIMatching,
  executeImport,
  type ImportDecision,
} from "@/app/(authenticated)/personell/innleide/import-actions";

// ─── Types ──────────────────────────────────────────────────────────

type ImportWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
};

type Step = 1 | 2 | 3 | 4;

type ImportResults = {
  created: number;
  merged: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function SummaryBar({ counts }: { counts: { creates: number; merges: number; skips: number; undecided: number } }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm">
      <div className="flex items-center gap-3">
        <span><span className="font-medium text-green-700">{counts.creates}</span> nye</span>
        <span><span className="font-medium text-blue-700">{counts.merges}</span> sammenslåinger</span>
        <span><span className="font-medium text-muted-foreground">{counts.skips}</span> hoppes over</span>
      </div>
      {counts.undecided > 0 && (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          {counts.undecided} ubestemt
        </Badge>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export function ImportWizard({ open, onOpenChange, onComplete }: ImportWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [matchResults, setMatchResults] = useState<MatchEntry[]>([]);
  const [decisions, setDecisions] = useState<Map<number, "create" | "merge" | "skip">>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [results, setResults] = useState<ImportResults | null>(null);
  const [showErrorsExpanded, setShowErrorsExpanded] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Reset state ─────────────────────────────────────────────────

  const resetState = useCallback(() => {
    setStep(1);
    setFile(null);
    setParsedRows([]);
    setParseErrors([]);
    setMatchResults([]);
    setDecisions(new Map());
    setIsLoading(false);
    setLoadingMessage("");
    setResults(null);
    setShowErrorsExpanded(false);
    setAiError(null);
    setFileName(null);
  }, []);

  function handleOpenChange(open: boolean) {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  }

  // ─── Step 1: File selection ──────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (droppedFile && (validTypes.includes(droppedFile.type) || droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      setFile(droppedFile);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleParseFile() {
    if (!file) return;

    setIsLoading(true);
    setLoadingMessage("Leser Excel-fil...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await parseExcelFile(formData);

      if (result.success) {
        setParsedRows(result.rows);
        setParseErrors(result.errors);
        if (result.fileName) setFileName(result.fileName);
        setStep(2);
      } else {
        setParseErrors(result.errors);
      }
    } catch (err) {
      setParseErrors([`Feil ved lesing: ${err instanceof Error ? err.message : "Ukjent feil"}`]);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }

  // ─── Step 2: Run AI matching ─────────────────────────────────────

  async function handleRunMatching() {
    setIsLoading(true);
    setLoadingMessage("Analyserer med AI...");

    try {
      const result = await runAIMatching(parsedRows);

      if (result.success || result.matches.length > 0) {
        setMatchResults(result.matches);
        if ("aiError" in result && result.aiError) {
          setAiError(result.aiError as string);
        }

        // Auto-select defaults
        const defaultDecisions = new Map<number, "create" | "merge" | "skip">();
        for (const match of result.matches) {
          if (match.matchedCandidateId && match.confidence >= 90) {
            defaultDecisions.set(match.rowIndex, "merge");
          } else if (!match.matchedCandidateId || match.confidence < 50) {
            defaultDecisions.set(match.rowIndex, "create");
          }
          // 50-90%: no default, user must choose
        }
        setDecisions(defaultDecisions);
        setStep(3);
      } else {
        setParseErrors(["aiError" in result && result.aiError ? String(result.aiError) : "AI-matching feilet"]);
      }
    } catch (err) {
      setParseErrors([`AI-feil: ${err instanceof Error ? err.message : "Ukjent feil"}`]);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }

  // ─── Step 3: Execute import ──────────────────────────────────────

  function setDecisionForRow(rowIndex: number, action: "create" | "merge" | "skip") {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.set(rowIndex, action);
      return next;
    });
  }

  function getActionCounts() {
    let creates = 0;
    let merges = 0;
    let skips = 0;
    let undecided = 0;

    for (const match of matchResults) {
      const action = decisions.get(match.rowIndex);
      if (action === "create") creates++;
      else if (action === "merge") merges++;
      else if (action === "skip") skips++;
      else undecided++;
    }

    return { creates, merges, skips, undecided };
  }

  function handleExecuteClick() {
    handleExecuteImport();
  }

  async function handleExecuteImport() {
    setIsLoading(true);
    setLoadingMessage("Importerer kandidater...");

    try {
      const importDecisions: ImportDecision[] = matchResults.map((match) => {
        const action = decisions.get(match.rowIndex) || "skip";
        const row = parsedRows.find((r) => r.rowIndex === match.rowIndex);

        return {
          rowIndex: match.rowIndex,
          action,
          matchedCandidateId: action === "merge" ? match.matchedCandidateId ?? undefined : undefined,
          rowData: {
            firstName: row?.firstName || "",
            lastName: row?.lastName || "",
            email: row?.email as string | undefined,
            mobilePhone: row?.mobilePhone as string | undefined,
            phone: row?.phone as string | undefined,
            title: row?.title as string | undefined,
            description: row?.description as string | undefined,
            address: row?.address as string | undefined,
            postalCode: row?.postalCode as string | undefined,
            postalPlace: row?.postalPlace as string | undefined,
            city: row?.city as string | undefined,
            country: row?.country as string | undefined,
            nationality: row?.nationality as string | undefined,
            gender: row?.gender as string | undefined,
            dob: row?.dob as string | undefined,
            rating: row?.rating as number | undefined,
            isContractor: row?.isContractor as boolean | undefined,
            company: row?.company as string | undefined,
            linkedIn: row?.linkedIn as string | undefined,
            skills: row?.skills as string[] | undefined,
            courses: row?.courses as string[] | undefined,
            driversLicense: row?.driversLicense as string[] | undefined,
            languages: row?.languages as string[] | undefined,
          },
        };
      });

      const result = await executeImport(importDecisions, fileName || undefined);
      setResults(result);
      setStep(4);
    } catch (err) {
      setParseErrors([`Import feilet: ${err instanceof Error ? err.message : "Ukjent feil"}`]);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }

  // ─── Confidence badge ────────────────────────────────────────────

  function ConfidenceBadge({ confidence }: { confidence: number }) {
    if (confidence >= 90) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
          {confidence}%
        </Badge>
      );
    }
    if (confidence >= 50) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">
          {confidence}%
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100">
        {confidence}%
      </Badge>
    );
  }

  // ─── Step indicators ─────────────────────────────────────────────

  const steps = [
    { num: 1, label: "Last opp" },
    { num: 2, label: "Forhåndsvisning" },
    { num: 3, label: "AI-analyse" },
    { num: 4, label: "Resultat" },
  ];

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Importer kandidater</SheetTitle>
          <SheetDescription>
            Last opp Excel-fil, analyser med AI, og importer til systemet
          </SheetDescription>

          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                    step >= s.num
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.num ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    s.num
                  )}
                </div>
                <span
                  className={`text-xs hidden sm:inline ${
                    step >= s.num ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={`w-6 h-px ${
                      step > s.num ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 px-4 pb-4 space-y-4">
          {/* Loading overlay */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{loadingMessage}</p>
            </div>
          )}

          {/* ─── Step 1: Upload ────────────────────────────────── */}
          {step === 1 && !isLoading && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary hover:bg-muted/50"
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-10 w-10 text-green-600" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Fjern
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="font-medium">Dra og slipp Excel-fil her</p>
                    <p className="text-sm text-muted-foreground">
                      eller klikk for å velge fil (.xlsx, .xls)
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Parse errors */}
              {parseErrors.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm font-medium">Feil ved lesing</p>
                  </div>
                  <ul className="mt-1 ml-6 text-sm text-red-700 list-disc">
                    {parseErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Template download */}
              <div className="flex items-center justify-between text-sm">
                <a
                  href="/api/kandidater/template"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Download className="h-4 w-4" />
                  Last ned Excel-mal
                </a>
              </div>
            </div>
          )}

          {/* ─── Step 2: Preview ───────────────────────────────── */}
          {step === 2 && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{parsedRows.length} rader funnet</p>
                {parsedRows.some((r) => r.isContractor) && (
                  <Badge variant="secondary">
                    {parsedRows.filter((r) => r.isContractor).length} merket som innleid
                  </Badge>
                )}
              </div>

              {/* Parse warnings */}
              {parseErrors.length > 0 && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm font-medium">Advarsler ({parseErrors.length})</p>
                  </div>
                  <ul className="mt-1 ml-6 text-sm text-yellow-700 list-disc">
                    {parseErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium text-xs">Rad</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Fornavn</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Etternavn</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">E-post</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Stilling</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Bedrift</th>
                          <th className="px-3 py-2 text-center font-medium text-xs">Innleid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((row) => {
                          const missingName = !row.firstName || !row.lastName;
                          return (
                            <tr
                              key={row.rowIndex}
                              className={`border-b last:border-0 ${
                                missingName ? "bg-red-50" : ""
                              }`}
                            >
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {row.rowIndex}
                              </td>
                              <td className={`px-3 py-2 ${!row.firstName ? "text-red-500 italic" : ""}`}>
                                {row.firstName || "Mangler"}
                              </td>
                              <td className={`px-3 py-2 ${!row.lastName ? "text-red-500 italic" : ""}`}>
                                {row.lastName || "Mangler"}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {row.email || "\u2014"}
                              </td>
                              <td className="px-3 py-2">{row.title || "\u2014"}</td>
                              <td className="px-3 py-2">{row.company || "\u2014"}</td>
                              <td className="px-3 py-2 text-center">
                                {row.isContractor ? (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">Ja</Badge>
                                ) : (
                                  <span className="text-muted-foreground">\u2014</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── Step 3: AI Match Review ───────────────────────── */}
          {step === 3 && !isLoading && (
            <div className="space-y-4">
              {/* AI error warning */}
              {aiError && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm font-medium">
                      AI-matching hadde problemer: {aiError}. Kontroller resultatene nøye.
                    </p>
                  </div>
                </div>
              )}

              {/* Info: local-only import */}
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  Kandidater opprettes kun lokalt. Synkronisering til RecMan skjer automatisk ved neste sync-kjøring.
                </p>
              </div>

              {/* Match table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium text-xs">Rad</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Fra Excel</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Bedrift</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Match</th>
                          <th className="px-3 py-2 text-center font-medium text-xs">Konfidens</th>
                          <th className="px-3 py-2 text-left font-medium text-xs w-[160px]">Handling</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchResults.map((match) => {
                          const row = parsedRows.find((r) => r.rowIndex === match.rowIndex);
                          const hasMatch = !!match.matchedCandidateId;
                          const currentAction = decisions.get(match.rowIndex);

                          return (
                            <tr
                              key={match.rowIndex}
                              className={`border-b last:border-0 ${
                                !currentAction && match.confidence >= 50 && match.confidence < 90
                                  ? "bg-yellow-50"
                                  : ""
                              }`}
                            >
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {match.rowIndex}
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-medium">
                                  {row?.firstName} {row?.lastName}
                                </div>
                                {row?.email && (
                                  <div className="text-xs text-muted-foreground">{row.email}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                {row?.company || "\u2014"}
                              </td>
                              <td className="px-3 py-2">
                                {hasMatch ? (
                                  <div>
                                    <div className="font-medium">{match.matchedCandidateName}</div>
                                    <div className="text-xs text-muted-foreground">{match.reason}</div>
                                    {(match.isEmployee || match.isContractor) && (
                                      <div className="flex gap-1 mt-0.5">
                                        {match.isEmployee && (
                                          <Badge variant="secondary" className="text-xs">
                                            Ansatt
                                          </Badge>
                                        )}
                                        {match.isContractor && (
                                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                                            Innleid
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    Ingen match funnet
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <ConfidenceBadge confidence={match.confidence} />
                              </td>
                              <td className="px-3 py-2">
                                <Select
                                  value={currentAction || ""}
                                  onValueChange={(v) =>
                                    setDecisionForRow(
                                      match.rowIndex,
                                      v as "create" | "merge" | "skip"
                                    )
                                  }
                                >
                                  <SelectTrigger
                                    className={`h-8 text-xs ${
                                      !currentAction ? "border-yellow-400" : ""
                                    }`}
                                  >
                                    <SelectValue placeholder="Velg handling..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {hasMatch && (
                                      <SelectItem value="merge">Merk som innleid</SelectItem>
                                    )}
                                    <SelectItem value="create">Opprett ny</SelectItem>
                                    <SelectItem value="skip">Hopp over</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary bar */}
              <SummaryBar counts={getActionCounts()} />

            </div>
          )}

          {/* ─── Step 4: Results ────────────────────────────────── */}
          {step === 4 && !isLoading && results && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
                <h3 className="text-lg font-semibold">Import fullført</h3>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{results.created}</div>
                    <p className="text-xs text-muted-foreground">Opprettet</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{results.merged}</div>
                    <p className="text-xs text-muted-foreground">Sammenslått</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-muted-foreground">{results.skipped}</div>
                    <p className="text-xs text-muted-foreground">Hoppet over</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${results.failed > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {results.failed}
                    </div>
                    <p className="text-xs text-muted-foreground">Feil</p>
                  </CardContent>
                </Card>
              </div>

              {/* Errors */}
              {results.errors.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <button
                    onClick={() => setShowErrorsExpanded(!showErrorsExpanded)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <p className="text-sm font-medium">
                        {results.errors.length} feil oppstod
                      </p>
                    </div>
                    {showErrorsExpanded ? (
                      <ChevronUp className="h-4 w-4 text-red-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-red-600" />
                    )}
                  </button>
                  {showErrorsExpanded && (
                    <ul className="mt-2 ml-6 text-sm text-red-700 list-disc space-y-1">
                      {results.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer buttons ──────────────────────────────────── */}
        {!isLoading && (
          <SheetFooter>
            <div className="flex items-center justify-between w-full">
              {/* Left: Back button */}
              <div>
                {step === 2 && (
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Tilbake
                  </Button>
                )}
                {step === 3 && (
                  <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Tilbake
                  </Button>
                )}
              </div>

              {/* Right: Next/Action button */}
              <div>
                {step === 1 && (
                  <Button size="sm" disabled={!file} onClick={handleParseFile}>
                    Neste
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                {step === 2 && (
                  <Button
                    size="sm"
                    onClick={handleRunMatching}
                    disabled={parsedRows.length === 0}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Analyser med AI
                  </Button>
                )}
                {step === 3 && (
                  <Button
                    size="sm"
                    onClick={handleExecuteClick}
                    disabled={getActionCounts().undecided > 0}
                  >
                    Utfor import
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                {step === 4 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onComplete();
                      handleOpenChange(false);
                    }}
                  >
                    Lukk
                  </Button>
                )}
              </div>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
