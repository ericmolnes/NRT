"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ImportResult {
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
  details: {
    createdNames: string[];
    skippedNames: string[];
  };
}

export function ImportContractors() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/form-auth/import-contractors", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);

      if (data.success && data.created > 0) {
        router.refresh();
      }
    } catch {
      setResult({
        success: false,
        created: 0,
        skipped: 0,
        errors: ["Noe gikk galt under opplasting"],
        details: { createdNames: [], skippedNames: [] },
      });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Importer innleid personell</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Last opp en Excel-fil (.xlsx) med kolonne 1 = fornavn og kolonne 2 = etternavn.
          Personene opprettes med rollen &ldquo;Innleid&rdquo;.
        </p>

        <div>
          <Label htmlFor="excel-upload" className="sr-only">
            Velg Excel-fil
          </Label>
          <input
            ref={inputRef}
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="gap-2"
          >
            {loading ? (
              <>
                <FileSpreadsheet className="h-4 w-4 animate-pulse" />
                Importerer...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Last opp Excel-fil
              </>
            )}
          </Button>
          {fileName && !loading && (
            <span className="ml-2 text-xs text-muted-foreground">{fileName}</span>
          )}
        </div>

        {result && (
          <div className="rounded-lg border p-3 space-y-2">
            {result.created > 0 && (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">{result.created} opprettet</span>
                  {result.details.createdNames.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.details.createdNames.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}
            {result.skipped > 0 && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">{result.skipped} hoppet over (finnes allerede)</span>
                  {result.details.skippedNames.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.details.skippedNames.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div className="text-sm text-destructive">
                  {result.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              </div>
            )}
            {result.created === 0 && result.skipped === 0 && result.errors.length === 0 && (
              <p className="text-sm text-muted-foreground">Ingen rader funnet i filen.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
