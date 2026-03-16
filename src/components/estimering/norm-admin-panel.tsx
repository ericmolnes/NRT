"use client";

import { useState, useTransition } from "react";
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
  RefreshCw,
  Save,
  History,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateNormFromStatistics,
  manualUpdateNorm,
} from "@/app/(authenticated)/estimering/[id]/actions";
import {
  createNormCategory,
  createWorkNorm,
  deleteWorkNorm,
} from "@/app/(authenticated)/admin/normer/actions";

type WorkNorm = {
  id: string;
  name: string;
  hoursPerUnit: number;
  unit: string;
  sizeRange: string | null;
};

type NormCategory = {
  id: string;
  name: string;
  discipline: string;
  norms: WorkNorm[];
};

type NormUpdateLog = {
  id: string;
  normId: string;
  previousValue: number;
  newValue: number;
  dataPoints: number;
  avgActual: number;
  stdDeviation: number | null;
  updatedByName: string;
  autoUpdated: boolean;
  createdAt: Date;
};

type NormStats = {
  dataPoints: number;
  avgActual: number;
  avgEstimated: number;
};

const disciplineLabels: Record<string, string> = {
  ELECTRICAL: "Elektro",
  INSTRUMENT: "Instrument",
  ENGINEERING: "Engineering",
};

function NormRow({
  norm,
  stats,
}: {
  norm: WorkNorm;
  stats?: NormStats;
}) {
  const [isPending, startTransition] = useTransition();
  const [editValue, setEditValue] = useState<string | null>(null);
  const [statResult, setStatResult] = useState<{
    previousValue: number;
    newValue: number;
    dataPoints: number;
  } | null>(null);

  function handleManualSave() {
    if (editValue === null) return;
    const newVal = parseFloat(editValue);
    if (isNaN(newVal) || newVal <= 0) return;

    startTransition(async () => {
      await manualUpdateNorm(norm.id, newVal);
      setEditValue(null);
    });
  }

  function handleStatUpdate() {
    startTransition(async () => {
      try {
        const result = await updateNormFromStatistics(norm.id);
        setStatResult(result);
      } catch {
        // Trenger minst 3 datapunkter
      }
    });
  }

  const deviation = stats
    ? ((stats.avgActual - stats.avgEstimated) / stats.avgEstimated) * 100
    : null;

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="font-medium">{norm.name}</div>
        {norm.sizeRange && (
          <div className="text-xs text-muted-foreground">
            Storrelse: {norm.sizeRange}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {editValue !== null ? (
          <div className="flex items-center gap-1">
            <Input
              className="h-7 w-20 text-right font-mono text-sm"
              type="number"
              step="0.001"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleManualSave}
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            className="font-mono text-sm font-medium hover:underline cursor-pointer"
            onClick={() => setEditValue(String(norm.hoursPerUnit))}
            title="Klikk for a redigere"
          >
            {norm.hoursPerUnit}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-center text-sm">{norm.unit}</td>
      <td className="px-4 py-3 text-center">
        {stats ? (
          <div className="space-y-1">
            <div className="text-sm font-mono">
              {stats.dataPoints} prosjekter
            </div>
            {deviation !== null && (
              <Badge
                variant="outline"
                className={
                  Math.abs(deviation) < 10
                    ? "text-green-700 border-green-300 bg-green-50"
                    : deviation > 0
                      ? "text-red-700 border-red-300 bg-red-50"
                      : "text-blue-700 border-blue-300 bg-blue-50"
                }
              >
                {deviation > 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {deviation > 0 ? "+" : ""}
                {deviation.toFixed(0)}% avvik
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Ingen data</span>
        )}
      </td>
      <td className="px-4 py-3">
        {stats && stats.dataPoints >= 3 ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleStatUpdate}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Oppdater fra statistikk
          </Button>
        ) : stats && stats.dataPoints > 0 ? (
          <span className="text-xs text-muted-foreground">
            Trenger {3 - stats.dataPoints} til
          </span>
        ) : null}
        {statResult && (
          <div className="mt-1 text-xs text-green-700">
            {statResult.previousValue} &rarr; {statResult.newValue} (
            {statResult.dataPoints} pkt)
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => {
            if (confirm("Er du sikker pa at du vil slette denne normen?")) {
              startTransition(async () => {
                try {
                  await deleteWorkNorm(norm.id);
                } catch {
                  alert("Kan ikke slette - normen er i bruk");
                }
              });
            }
          }}
          disabled={isPending}
          title="Slett norm"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}

function AddNormRow({ categoryId }: { categoryId: string }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [hoursPerUnit, setHoursPerUnit] = useState("");
  const [unit, setUnit] = useState("stk");
  const [sizeRange, setSizeRange] = useState("");

  function handleAdd() {
    if (!name.trim() || !hoursPerUnit) return;
    startTransition(async () => {
      await createWorkNorm({
        name: name.trim(),
        hoursPerUnit: parseFloat(hoursPerUnit),
        unit,
        sizeRange: sizeRange || undefined,
        categoryId,
      });
      setName("");
      setHoursPerUnit("");
      setSizeRange("");
    });
  }

  return (
    <tr className="border-t bg-muted/20">
      <td className="px-4 py-2">
        <Input className="h-7 text-sm" placeholder="Normnavn..." value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="px-4 py-2">
        <Input className="h-7 w-20 text-right font-mono text-sm" type="number" step="0.001" placeholder="0.000" value={hoursPerUnit} onChange={(e) => setHoursPerUnit(e.target.value)} />
      </td>
      <td className="px-4 py-2">
        <Input className="h-7 w-16 text-sm" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </td>
      <td className="px-4 py-2">
        <Input className="h-7 w-20 text-sm" placeholder="Storrelse" value={sizeRange} onChange={(e) => setSizeRange(e.target.value)} />
      </td>
      <td colSpan={2} className="px-4 py-2">
        <Button variant="ghost" size="sm" className="h-7" onClick={handleAdd} disabled={isPending || !name.trim() || !hoursPerUnit}>
          <Plus className="mr-1 h-3 w-3" /> Legg til
        </Button>
      </td>
    </tr>
  );
}

function AddCategoryForm() {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [discipline, setDiscipline] = useState<"ELECTRICAL" | "INSTRUMENT" | "ENGINEERING">("ELECTRICAL");

  function handleAdd() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createNormCategory({ name: name.trim(), discipline });
      setName("");
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">Ny kategori</label>
            <Input className="h-8" placeholder="Kategorinavn..." value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Disiplin</label>
            <Select value={discipline} onValueChange={(v: string | null) => { if (v) setDiscipline(v as typeof discipline); }}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ELECTRICAL">Elektro</SelectItem>
                <SelectItem value="INSTRUMENT">Instrument</SelectItem>
                <SelectItem value="ENGINEERING">Engineering</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={isPending || !name.trim()}>
            <Plus className="mr-1 h-3 w-3" /> Opprett
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function NormAdminPanel({
  normCategories,
  recentLogs,
  statsMap,
}: {
  normCategories: NormCategory[];
  recentLogs: NormUpdateLog[];
  statsMap: Record<string, NormStats>;
}) {
  return (
    <div className="space-y-6">
      {normCategories.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              Ingen normkategorier
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Opprett normkategorier og normer i databasen forst.
            </p>
          </CardContent>
        </Card>
      )}

      {normCategories.map((cat) => (
        <Card key={cat.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {cat.name}
              <Badge variant="outline" className="ml-2 text-xs">
                {disciplineLabels[cat.discipline] || cat.discipline}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Norm</th>
                  <th className="px-4 py-2 text-center font-medium">
                    Timer/enhet
                  </th>
                  <th className="px-4 py-2 text-center font-medium">Enhet</th>
                  <th className="px-4 py-2 text-center font-medium">
                    Statistikk
                  </th>
                  <th className="px-4 py-2 text-left font-medium">
                    Handling
                  </th>
                  <th className="px-4 py-2 w-12" />
                </tr>
              </thead>
              <tbody>
                {cat.norms.map((norm) => (
                  <NormRow
                    key={norm.id}
                    norm={norm}
                    stats={statsMap[norm.id]}
                  />
                ))}
                <AddNormRow categoryId={cat.id} />
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {recentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Endringslogg
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Dato</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-center font-medium">
                    Forrige
                  </th>
                  <th className="px-4 py-2 text-center font-medium">Ny</th>
                  <th className="px-4 py-2 text-center font-medium">
                    Datapunkter
                  </th>
                  <th className="px-4 py-2 text-left font-medium">
                    Endret av
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2 text-xs">
                      {new Date(log.createdAt).toLocaleString("nb-NO")}
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        variant={log.autoUpdated ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {log.autoUpdated ? "Statistisk" : "Manuell"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-center font-mono">
                      {log.previousValue}
                    </td>
                    <td className="px-4 py-2 text-center font-mono font-medium">
                      {log.newValue}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {log.dataPoints > 0 ? log.dataPoints : "-"}
                    </td>
                    <td className="px-4 py-2">{log.updatedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <AddCategoryForm />
    </div>
  );
}
