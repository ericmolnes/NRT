"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";
import { registerActualTime } from "@/app/(authenticated)/estimering/[id]/actions";

type LaborSummary = {
  id: string;
  discipline: string;
  roleCode: string;
  totalHours: number;
  hourlyRate: number;
  totalCost: number;
};

type ActualTimeEntry = {
  id: string;
  discipline: string;
  category: string;
  description: string | null;
  estimatedHours: number;
  actualHours: number;
  adjustmentFactor: number | null;
  adjustmentNote: string | null;
  registeredByName: string;
  createdAt: Date;
};

type Cable = {
  id: string;
  tagNumber: string | null;
  cableType: string;
  lengthMeters: number;
  sizeCategory: string | null;
};

type ScopeItem = {
  id: string;
  description: string;
  discipline: string;
  totalHours: number | null;
};

type Estimate = {
  id: string;
  status: string;
  totalLaborHours: number;
  actualLaborHours: number | null;
  laborSummary: LaborSummary[];
  cables: Cable[];
  scopeItems: ScopeItem[];
  actualTimeEntries: ActualTimeEntry[];
};

const disciplineLabels: Record<string, string> = {
  ELECTRICAL: "Elektro",
  INSTRUMENT: "Instrument",
  ENGINEERING: "Engineering",
};

const adjustmentPresets = [
  { value: "1.0", label: "Normal" },
  { value: "1.3", label: "Darlig tilkomst (+30%)" },
  { value: "1.5", label: "Meget darlig tilkomst (+50%)" },
  { value: "0.7", label: "Samtidig trekk (-30%)" },
  { value: "0.8", label: "Effektiv rigg (-20%)" },
  { value: "1.2", label: "Ekstra sikkerhet (+20%)" },
  { value: "custom", label: "Egendefinert..." },
];

interface TimeEntryDraft {
  discipline: "ELECTRICAL" | "INSTRUMENT" | "ENGINEERING";
  category: string;
  description: string;
  estimatedHours: number;
  actualHours: string;
  adjustmentFactor: string;
  adjustmentNote: string;
}

function DeviationBadge({ estimated, actual }: { estimated: number; actual: number }) {
  if (estimated === 0) return null;
  const deviation = ((actual - estimated) / estimated) * 100;
  const absDeviation = Math.abs(deviation);

  if (absDeviation < 5) {
    return (
      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
        <Minus className="mr-1 h-3 w-3" />
        {deviation.toFixed(0)}%
      </Badge>
    );
  }

  if (deviation > 0) {
    return (
      <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
        <TrendingUp className="mr-1 h-3 w-3" />
        +{deviation.toFixed(0)}%
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
      <TrendingDown className="mr-1 h-3 w-3" />
      {deviation.toFixed(0)}%
    </Badge>
  );
}

function ActualTimeForm({ estimate }: { estimate: Estimate }) {
  const [isPending, startTransition] = useTransition();

  // Generer initial entries basert pa labor summary
  const initialEntries = useMemo(() => {
    const entries: TimeEntryDraft[] = [];

    // En entry per labor summary rad
    for (const ls of estimate.laborSummary) {
      entries.push({
        discipline: ls.discipline as TimeEntryDraft["discipline"],
        category: `${disciplineLabels[ls.discipline] || ls.discipline} - ${ls.roleCode}`,
        description: "",
        estimatedHours: ls.totalHours,
        actualHours: "",
        adjustmentFactor: "1.0",
        adjustmentNote: "",
      });
    }

    // Hvis ingen labor summary, lag generisk
    if (entries.length === 0) {
      entries.push({
        discipline: "ELECTRICAL",
        category: "Generelt arbeid",
        description: "",
        estimatedHours: estimate.totalLaborHours,
        actualHours: "",
        adjustmentFactor: "1.0",
        adjustmentNote: "",
      });
    }

    return entries;
  }, [estimate.laborSummary, estimate.totalLaborHours]);

  const [entries, setEntries] = useState<TimeEntryDraft[]>(initialEntries);

  function updateEntry(index: number, field: keyof TimeEntryDraft, value: string) {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addEntry() {
    setEntries((prev) => [
      ...prev,
      {
        discipline: "ELECTRICAL",
        category: "",
        description: "",
        estimatedHours: 0,
        actualHours: "",
        adjustmentFactor: "1.0",
        adjustmentNote: "",
      },
    ]);
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  const totalEstimated = entries.reduce((s, e) => s + e.estimatedHours, 0);
  const totalActual = entries.reduce(
    (s, e) => s + (parseFloat(e.actualHours) || 0),
    0
  );

  function handleSubmit() {
    const validEntries = entries
      .filter((e) => e.actualHours && parseFloat(e.actualHours) > 0)
      .map((e) => ({
        discipline: e.discipline,
        category: e.category,
        description: e.description || undefined,
        estimatedHours: e.estimatedHours,
        actualHours: parseFloat(e.actualHours),
        adjustmentFactor:
          e.adjustmentFactor !== "1.0"
            ? parseFloat(e.adjustmentFactor)
            : undefined,
        adjustmentNote: e.adjustmentNote || undefined,
      }));

    if (validEntries.length === 0) return;

    startTransition(async () => {
      await registerActualTime(estimate.id, validEntries);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Registrer faktisk medgatt tid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.map((entry, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Kategori
                    </label>
                    <Input
                      className="mt-1 h-8 text-sm"
                      value={entry.category}
                      onChange={(e) =>
                        updateEntry(i, "category", e.target.value)
                      }
                      placeholder="F.eks. Kabelinstallasjon"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Disiplin
                    </label>
                    <Select
                      value={entry.discipline}
                      onValueChange={(v: string | null) => { if (v) updateEntry(i, "discipline", v); }}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ELECTRICAL">Elektro</SelectItem>
                        <SelectItem value="INSTRUMENT">Instrument</SelectItem>
                        <SelectItem value="ENGINEERING">Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Estimert (t)
                      </label>
                      <Input
                        className="mt-1 h-8 text-sm font-mono text-right"
                        type="number"
                        step="0.5"
                        value={entry.estimatedHours}
                        onChange={(e) =>
                          updateEntry(i, "estimatedHours", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Faktisk (t)
                      </label>
                      <Input
                        className="mt-1 h-8 text-sm font-mono text-right"
                        type="number"
                        step="0.5"
                        value={entry.actualHours}
                        onChange={(e) =>
                          updateEntry(i, "actualHours", e.target.value)
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                {entries.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-8 text-xs text-destructive"
                    onClick={() => removeEntry(i)}
                  >
                    Fjern
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Korreksjonsfaktor
                  </label>
                  <Select
                    value={
                      adjustmentPresets.some(
                        (p) => p.value === entry.adjustmentFactor
                      )
                        ? entry.adjustmentFactor
                        : "custom"
                    }
                    onValueChange={(v: string | null) => {
                      if (v && v !== "custom") {
                        updateEntry(i, "adjustmentFactor", v);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {adjustmentPresets.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!adjustmentPresets.some(
                    (p) => p.value === entry.adjustmentFactor
                  ) && (
                    <Input
                      className="mt-1 h-8 text-sm font-mono text-right"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="3.0"
                      value={entry.adjustmentFactor}
                      onChange={(e) =>
                        updateEntry(i, "adjustmentFactor", e.target.value)
                      }
                    />
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Merknad (darlig tilkomst, samtidig trekk, etc.)
                  </label>
                  <Textarea
                    className="mt-1 h-8 min-h-8 text-sm resize-none"
                    value={entry.adjustmentNote}
                    onChange={(e) =>
                      updateEntry(i, "adjustmentNote", e.target.value)
                    }
                    placeholder="Beskriv spesielle forhold..."
                  />
                </div>
              </div>

              {entry.actualHours && entry.estimatedHours > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <DeviationBadge
                    estimated={entry.estimatedHours}
                    actual={parseFloat(entry.actualHours)}
                  />
                  {entry.adjustmentFactor !== "1.0" && (
                    <span className="text-xs text-muted-foreground">
                      Faktor: {entry.adjustmentFactor}x
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addEntry}>
            + Legg til rad
          </Button>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-4 text-sm">
                <span>
                  Estimert totalt:{" "}
                  <strong className="font-mono">
                    {totalEstimated.toFixed(1)} t
                  </strong>
                </span>
                <span>
                  Faktisk totalt:{" "}
                  <strong className="font-mono">
                    {totalActual.toFixed(1)} t
                  </strong>
                </span>
                {totalActual > 0 && (
                  <DeviationBadge
                    estimated={totalEstimated}
                    actual={totalActual}
                  />
                )}
              </div>
              {totalActual > 0 && (
                <p className="text-xs text-muted-foreground">
                  Estimatet var{" "}
                  {totalActual > totalEstimated ? "for lavt" : "for hoyt"} med{" "}
                  {Math.abs(totalActual - totalEstimated).toFixed(1)} timer
                </p>
              )}
            </div>
            <Button onClick={handleSubmit} disabled={isPending || totalActual === 0}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Lagre og fullfor prosjekt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActualTimeSummary({ estimate }: { estimate: Estimate }) {
  const totalEstimated = estimate.totalLaborHours;
  const totalActual = estimate.actualLaborHours || 0;
  const entries = estimate.actualTimeEntries;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Estimert</div>
            <div className="text-2xl font-bold font-mono">
              {totalEstimated.toFixed(1)} t
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Faktisk</div>
            <div className="text-2xl font-bold font-mono">
              {totalActual.toFixed(1)} t
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Avvik</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono">
                {(totalActual - totalEstimated).toFixed(1)} t
              </span>
              <DeviationBadge estimated={totalEstimated} actual={totalActual} />
            </div>
          </CardContent>
        </Card>
      </div>

      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detaljert tidsrapport</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Kategori</th>
                  <th className="px-3 py-2 text-left font-medium">Disiplin</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Estimert
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Faktisk</th>
                  <th className="px-3 py-2 text-center font-medium">Avvik</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Justering
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 font-medium">{entry.category}</td>
                    <td className="px-3 py-2">
                      {disciplineLabels[entry.discipline] || entry.discipline}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {entry.estimatedHours.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium">
                      {entry.actualHours.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <DeviationBadge
                        estimated={entry.estimatedHours}
                        actual={entry.actualHours}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {entry.adjustmentFactor && (
                        <span className="text-xs">
                          {entry.adjustmentFactor}x
                          {entry.adjustmentNote && (
                            <span className="text-muted-foreground ml-1">
                              ({entry.adjustmentNote})
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            {totalActual <= totalEstimated * 1.05 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {totalActual <= totalEstimated * 1.05
                  ? "Estimatet var innenfor akseptabelt avvik"
                  : "Estimatet hadde vesentlig avvik"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalActual <= totalEstimated * 1.05
                  ? "Normene som ble brukt ser ut til a stemme bra. Dataene vil bidra til a forbedre fremtidige estimater."
                  : "Vurder a oppdatere normene basert pa denne erfaringen. Bruk normoppdatering i admin-panelet."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function EstimateActualTimeTab({ estimate }: { estimate: Estimate }) {
  const isCompleted =
    estimate.status === "COMPLETED" && estimate.actualTimeEntries.length > 0;

  if (isCompleted) {
    return <ActualTimeSummary estimate={estimate} />;
  }

  if (estimate.status !== "APPROVED" && estimate.status !== "COMPLETED") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">
            Estimatet ma vare godkjent for
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Faktisk tid kan forst registreres nar estimatet er godkjent og
            arbeidet er utfort.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ActualTimeForm estimate={estimate} />;
}
