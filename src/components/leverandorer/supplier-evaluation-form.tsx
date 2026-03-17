"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { addEvaluation } from "@/app/(authenticated)/leverandorer/[id]/actions";
import { Star } from "lucide-react";

const dimensions = [
  { key: "qualityScore", label: "Kvalitet", weight: "30%", color: "text-emerald-500" },
  { key: "deliveryScore", label: "Levering", weight: "25%", color: "text-blue-500" },
  { key: "priceScore", label: "Pris", weight: "20%", color: "text-violet-500" },
  { key: "hseScore", label: "HMS", weight: "15%", color: "text-amber-500" },
  { key: "communicationScore", label: "Kommunikasjon", weight: "10%", color: "text-teal-500" },
] as const;

function ScoreSelector({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              n <= value ? color + " fill-current" : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function SupplierEvaluationForm({
  supplierId,
  onDone,
}: {
  supplierId: string;
  onDone?: () => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>({
    qualityScore: 3,
    deliveryScore: 3,
    priceScore: 3,
    hseScore: 3,
    communicationScore: 3,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weightedTotal =
    (scores.qualityScore * 0.3 +
      scores.deliveryScore * 0.25 +
      scores.priceScore * 0.2 +
      scores.hseScore * 0.15 +
      scores.communicationScore * 0.1) *
    20;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const result = await addEvaluation({
      supplierId,
      ...scores,
      period: (fd.get("period") as string) || undefined,
      comment: (fd.get("comment") as string) || undefined,
    });

    setSaving(false);
    if (result.success) {
      onDone?.();
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold">Ny evaluering</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Totalscore:</span>
              <span
                className={`text-lg font-bold tabular-nums ${
                  weightedTotal >= 80
                    ? "text-emerald-600"
                    : weightedTotal >= 60
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {Math.round(weightedTotal)}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>

          {/* Score bar visualization */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                weightedTotal >= 80
                  ? "bg-emerald-500"
                  : weightedTotal >= 60
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${weightedTotal}%` }}
            />
          </div>

          {/* Scoring dimensions */}
          <div className="space-y-3">
            {dimensions.map((dim) => (
              <div
                key={dim.key}
                className="flex items-center justify-between gap-4 py-1"
              >
                <div className="flex items-center gap-2 min-w-[140px]">
                  <span className="text-sm font-medium">{dim.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({dim.weight})
                  </span>
                </div>
                <ScoreSelector
                  value={scores[dim.key]}
                  onChange={(v) =>
                    setScores((prev) => ({ ...prev, [dim.key]: v }))
                  }
                  color={dim.color}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Periode</Label>
              <Input name="period" className="h-9 mt-1" placeholder="2026-Q1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Kommentar</Label>
            <Textarea name="comment" rows={3} className="text-sm mt-1" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            {onDone && (
              <Button type="button" variant="outline" size="sm" onClick={onDone}>
                Avbryt
              </Button>
            )}
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Lagrer..." : "Registrer evaluering"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
