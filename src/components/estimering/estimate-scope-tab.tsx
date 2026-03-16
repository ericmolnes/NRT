"use client";

import { useTransition, useState } from "react";
import { ConfidenceBadge } from "./confidence-badge";
import { AdjustmentFactorSelect } from "./adjustment-factor-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListChecks, Check, Trash2, Plus } from "lucide-react";
import {
  updateScopeItem,
  deleteScopeItem,
  addScopeItem,
} from "@/app/(authenticated)/estimering/[id]/actions";

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
  norms: WorkNorm[];
};

type EstimateScopeItem = {
  id: string;
  description: string;
  discipline: string;
  normId: string | null;
  quantity: number;
  unit: string;
  hoursPerUnit: number | null;
  totalHours: number | null;
  adjustmentFactor: number;
  adjustmentNote: string | null;
  aiConfidence: number | null;
  verified: boolean;
};

function ScopeItemRow({
  item,
  normCategories,
}: {
  item: EstimateScopeItem;
  normCategories: NormCategory[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleVerify() {
    startTransition(() => {
      updateScopeItem(item.id, { verified: true });
    });
  }

  function handleDelete() {
    startTransition(() => {
      deleteScopeItem(item.id);
    });
  }

  function handleBlur(field: string, value: string) {
    const numFields = ["quantity", "hoursPerUnit"];
    const update: Record<string, unknown> = {};

    if (numFields.includes(field)) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        const original = (item as Record<string, unknown>)[field];
        if (num !== original) {
          update[field] = num;
          if (field === "quantity" && item.hoursPerUnit) {
            update.totalHours = num * item.hoursPerUnit * item.adjustmentFactor;
          } else if (field === "hoursPerUnit") {
            update.totalHours = item.quantity * num * item.adjustmentFactor;
          }
        }
      }
    } else {
      const original = (item as Record<string, unknown>)[field] ?? "";
      if (value !== original) update[field] = value;
    }

    if (Object.keys(update).length > 0) {
      startTransition(() => {
        updateScopeItem(item.id, update as Parameters<typeof updateScopeItem>[1]);
      });
    }
  }

  function handleAdjustmentChange(factor: number) {
    startTransition(() => {
      updateScopeItem(item.id, { adjustmentFactor: factor });
    });
  }

  function handleDisciplineChange(value: string | null) {
    if (!value) return;
    if (value !== item.discipline) {
      startTransition(() => {
        updateScopeItem(item.id, {
          discipline: value as "ELECTRICAL" | "INSTRUMENT" | "ENGINEERING",
        });
      });
    }
  }

  function handleNormChange(normId: string | null) {
    if (!normId) return;
    if (normId === "manual") {
      startTransition(() => {
        updateScopeItem(item.id, {
          hoursPerUnit: item.hoursPerUnit || 0,
          totalHours: item.quantity * (item.hoursPerUnit || 0) * item.adjustmentFactor,
        });
      });
      return;
    }

    for (const cat of normCategories) {
      const norm = cat.norms.find((n) => n.id === normId);
      if (norm) {
        startTransition(() => {
          updateScopeItem(item.id, {
            hoursPerUnit: norm.hoursPerUnit,
            totalHours: item.quantity * norm.hoursPerUnit * item.adjustmentFactor,
          });
        });
        return;
      }
    }
  }

  const currentNormName = (() => {
    if (!item.normId) return null;
    for (const cat of normCategories) {
      const norm = cat.norms.find((n) => n.id === item.normId);
      if (norm) return `${cat.name} - ${norm.name}`;
    }
    return null;
  })();

  // Live-beregnet total for visning
  const displayTotal = item.hoursPerUnit
    ? item.quantity * item.hoursPerUnit * item.adjustmentFactor
    : item.totalHours;

  return (
    <tr
      className={`border-b last:border-0 ${isPending ? "opacity-50" : ""} ${!item.verified ? "bg-amber-50/50" : ""}`}
    >
      <td className="px-3 py-2">
        <Input
          className="h-8 w-full min-w-[180px] text-sm font-medium"
          defaultValue={item.description}
          onBlur={(e) => handleBlur("description", e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Select defaultValue={item.discipline} onValueChange={handleDisciplineChange}>
          <SelectTrigger className="h-8 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ELECTRICAL">Elektro</SelectItem>
            <SelectItem value="INSTRUMENT">Instrument</SelectItem>
            <SelectItem value="ENGINEERING">Engineering</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Select defaultValue={item.normId || "manual"} onValueChange={handleNormChange}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Velg norm...">{currentNormName || "Manuell"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manuell</SelectItem>
            {normCategories.map((cat) =>
              cat.norms.map((norm) => (
                <SelectItem key={norm.id} value={norm.id}>
                  {cat.name} - {norm.name} ({norm.hoursPerUnit} t/{norm.unit})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-14 text-right font-mono text-sm"
          type="number"
          step="0.1"
          defaultValue={item.quantity}
          onBlur={(e) => handleBlur("quantity", e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-14 text-sm"
          defaultValue={item.unit}
          onBlur={(e) => handleBlur("unit", e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-14 text-right font-mono text-sm"
          type="number"
          step="0.01"
          defaultValue={item.hoursPerUnit ?? ""}
          onBlur={(e) => handleBlur("hoursPerUnit", e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <AdjustmentFactorSelect
          value={item.adjustmentFactor}
          onValueChange={handleAdjustmentChange}
        />
      </td>
      <td className="px-3 py-2 text-right font-mono font-medium">
        {displayTotal?.toFixed(1) || "-"}
      </td>
      <td className="px-3 py-2 text-center">
        <ConfidenceBadge confidence={item.aiConfidence} verified={item.verified} />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          {!item.verified && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleVerify} title="Verifiser">
              <Check className="h-3.5 w-3.5 text-green-600" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleDelete} title="Slett">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AddScopeItemRow({
  estimateId,
  normCategories,
}: {
  estimateId: string;
  normCategories: NormCategory[];
}) {
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState("");
  const [discipline, setDiscipline] = useState<"ELECTRICAL" | "INSTRUMENT" | "ENGINEERING">("ELECTRICAL");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("stk");
  const [hoursPerUnit, setHoursPerUnit] = useState("");
  const [normId, setNormId] = useState<string | null>(null);
  const [adjustmentFactor, setAdjustmentFactor] = useState(1.0);

  function handleNormChange(value: string | null) {
    if (!value) return;
    if (value === "manual") {
      setNormId(null);
      return;
    }
    setNormId(value);
    for (const cat of normCategories) {
      const norm = cat.norms.find((n) => n.id === value);
      if (norm) {
        setHoursPerUnit(String(norm.hoursPerUnit));
        setUnit(norm.unit);
        break;
      }
    }
  }

  function handleAdd() {
    if (!description.trim()) return;
    const qty = parseFloat(quantity) || 1;
    const hpu = parseFloat(hoursPerUnit) || undefined;

    startTransition(async () => {
      await addScopeItem(estimateId, {
        description: description.trim(),
        discipline,
        quantity: qty,
        unit,
        hoursPerUnit: hpu,
        normId: normId || undefined,
        adjustmentFactor,
      });
      setDescription("");
      setQuantity("1");
      setHoursPerUnit("");
      setNormId(null);
      setAdjustmentFactor(1.0);
    });
  }

  const previewTotal =
    hoursPerUnit && quantity
      ? parseFloat(quantity) * parseFloat(hoursPerUnit) * adjustmentFactor
      : null;

  return (
    <tr className="border-t bg-muted/20">
      <td className="px-3 py-2">
        <Input
          className="h-8 w-full min-w-[180px] text-sm"
          placeholder="Ny post..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Select value={discipline} onValueChange={(v: string | null) => { if (v) setDiscipline(v as typeof discipline); }}>
          <SelectTrigger className="h-8 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ELECTRICAL">Elektro</SelectItem>
            <SelectItem value="INSTRUMENT">Instrument</SelectItem>
            <SelectItem value="ENGINEERING">Engineering</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Select value={normId || "manual"} onValueChange={handleNormChange}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Velg norm..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manuell</SelectItem>
            {normCategories.map((cat) =>
              cat.norms.map((norm) => (
                <SelectItem key={norm.id} value={norm.id}>
                  {cat.name} - {norm.name} ({norm.hoursPerUnit} t/{norm.unit})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 w-14 text-right font-mono text-sm" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 w-14 text-sm" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 w-14 text-right font-mono text-sm" type="number" step="0.01" value={hoursPerUnit} onChange={(e) => setHoursPerUnit(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <AdjustmentFactorSelect value={adjustmentFactor} onValueChange={setAdjustmentFactor} />
      </td>
      <td className="px-3 py-2 text-right font-mono text-sm text-muted-foreground">
        {previewTotal !== null ? previewTotal.toFixed(1) : "-"}
      </td>
      <td />
      <td className="px-3 py-2">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleAdd} disabled={isPending || !description.trim()} title="Legg til">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

export function EstimateScopeTab({
  scopeItems,
  estimateId,
  normCategories = [],
}: {
  scopeItems: EstimateScopeItem[];
  estimateId: string;
  normCategories?: NormCategory[];
}) {
  if (scopeItems.length === 0 && normCategories.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Ingen omfangsposter</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Omfangsposter vil vises her etter AI-analyse eller manuell registrering.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalHours = scopeItems.reduce((sum, item) => sum + (item.totalHours || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Arbeidsomfang ({scopeItems.length})</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {scopeItems.filter((s) => s.verified).length} av {scopeItems.length} verifisert
          </span>
          <span className="text-sm font-medium">Totalt: {totalHours.toFixed(1)} timer</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-3 text-left font-medium">Beskrivelse</th>
                  <th className="px-3 py-3 text-left font-medium">Disiplin</th>
                  <th className="px-3 py-3 text-left font-medium">Norm</th>
                  <th className="px-3 py-3 text-right font-medium">Antall</th>
                  <th className="px-3 py-3 text-left font-medium">Enhet</th>
                  <th className="px-3 py-3 text-right font-medium">T/enhet</th>
                  <th className="px-3 py-3 text-center font-medium">Tilkomst</th>
                  <th className="px-3 py-3 text-right font-medium">Timer tot.</th>
                  <th className="px-3 py-3 text-center font-medium">Status</th>
                  <th className="px-3 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {scopeItems.map((item) => (
                  <ScopeItemRow key={item.id} item={item} normCategories={normCategories} />
                ))}
                <AddScopeItemRow estimateId={estimateId} normCategories={normCategories} />
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td colSpan={7} className="px-3 py-3 text-right">Totalt timer:</td>
                  <td className="px-3 py-3 text-right font-mono">{totalHours.toFixed(1)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
