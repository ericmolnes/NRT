"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createCAPA } from "@/app/(authenticated)/leverandorer/[id]/actions";

export function CorrectiveActionForm({
  nonConformanceId,
  onDone,
}: {
  nonConformanceId: string;
  onDone?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const result = await createCAPA({
      nonConformanceId,
      type: fd.get("type") as string,
      description: fd.get("description") as string,
      responsibleName: fd.get("responsibleName") as string,
      dueDate: fd.get("dueDate") as string,
    });

    setSaving(false);
    if (result.success) {
      onDone?.();
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-5">
        <h3 className="font-display text-sm font-semibold mb-4">Nytt korrigerende tiltak</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Type *</Label>
            <select
              name="type"
              required
              className="flex h-9 mt-1 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="CORRECTIVE">Korrigerende</option>
              <option value="PREVENTIVE">Forebyggende</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Beskrivelse *</Label>
            <Textarea name="description" rows={3} className="text-sm mt-1" required placeholder="Hva skal gjøres..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Ansvarlig *</Label>
              <Input name="responsibleName" className="h-9 mt-1" required placeholder="Navn" />
            </div>
            <div>
              <Label className="text-xs">Frist *</Label>
              <Input name="dueDate" type="date" className="h-9 mt-1" required />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            {onDone && (
              <Button type="button" variant="outline" size="sm" onClick={onDone}>
                Avbryt
              </Button>
            )}
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Oppretter..." : "Opprett tiltak"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
