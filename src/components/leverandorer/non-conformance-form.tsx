"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createNC } from "@/app/(authenticated)/leverandorer/[id]/actions";

export function NonConformanceForm({
  supplierId,
  onDone,
}: {
  supplierId: string;
  onDone?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const result = await createNC({
      supplierId,
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      severity: parseInt(fd.get("severity") as string) || 1,
      detectedDate: (fd.get("detectedDate") as string) || undefined,
    });

    setSaving(false);
    if (result.success) {
      onDone?.();
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <Card className="border-dashed border-red-200">
      <CardContent className="p-5">
        <h3 className="font-display text-sm font-semibold mb-4">Registrer avvik</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Tittel *</Label>
            <Input name="title" className="h-9 mt-1" required placeholder="Kort beskrivelse av avviket" />
          </div>
          <div>
            <Label className="text-xs">Beskrivelse *</Label>
            <Textarea name="description" rows={3} className="text-sm mt-1" required placeholder="Detaljert beskrivelse..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Alvorlighetsgrad</Label>
              <select
                name="severity"
                className="flex h-9 mt-1 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="1">1 — Mindre</option>
                <option value="2">2 — Alvorlig</option>
                <option value="3">3 — Kritisk</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Oppdaget dato</Label>
              <Input name="detectedDate" type="date" className="h-9 mt-1" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            {onDone && (
              <Button type="button" variant="outline" size="sm" onClick={onDone}>
                Avbryt
              </Button>
            )}
            <Button type="submit" size="sm" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
              {saving ? "Oppretter..." : "Registrer avvik"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
