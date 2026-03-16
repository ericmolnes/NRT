"use client";

import { useMemo, useState, useTransition } from "react";
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
import { AdjustmentFactorSelect } from "./adjustment-factor-select";
import { getAdjustmentColor } from "@/lib/estimering/adjustment-factors";
import { Calculator, Plus, Trash2 } from "lucide-react";
import {
  updateScopeItem,
  deleteScopeItem,
  updateCable,
  deleteCable,
  updateEquipment,
  deleteEquipment,
  addCalculatorLine,
} from "@/app/(authenticated)/estimering/[id]/actions";

type Cable = {
  id: string;
  tagNumber: string | null;
  cableType: string;
  lengthMeters: number;
  sizeCategory: string | null;
  adjustmentFactor: number | null;
};

type Equipment = {
  id: string;
  tagNumber: string | null;
  name: string;
  type: string;
  action: string;
  quantity: number;
  adjustmentFactor: number | null;
};

type ScopeItem = {
  id: string;
  description: string;
  discipline: string;
  quantity: number;
  unit: string;
  hoursPerUnit: number | null;
  totalHours: number | null;
  adjustmentFactor: number;
  normId: string | null;
};

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

type Estimate = {
  id: string;
  totalLaborHours: number;
  totalLaborCost: number;
  totalMaterialCost: number;
  totalCost: number;
  markupPercent: number;
  contingencyPercent: number;
  fieldEngineerPercent: number;
  mobDemobCost: number;
  equipmentRentalCost: number;
  cables: Cable[];
  equipment: Equipment[];
  scopeItems: ScopeItem[];
};

const formatNOK = (amount: number) =>
  new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amount);

interface CalcRow {
  id: string;
  description: string;
  normName: string | null;
  quantity: number;
  unit: string;
  hoursPerUnit: number;
  adjustmentFactor: number;
  adjustedHoursPerUnit: number;
  totalHours: number;
  section: string;
  discipline: string;
  sourceType: "cable" | "equipment" | "scope";
}

function EditableCalcRow({
  row,
  onDelete,
}: {
  row: CalcRow;
  onDelete: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleQuantityBlur(value: string) {
    const num = parseFloat(value);
    if (isNaN(num) || num === row.quantity) return;

    startTransition(() => {
      if (row.sourceType === "cable") {
        updateCable(row.id, { lengthMeters: num });
      } else if (row.sourceType === "equipment") {
        updateEquipment(row.id, { quantity: Math.round(num) });
      } else {
        updateScopeItem(row.id, {
          quantity: num,
          totalHours: num * row.hoursPerUnit * row.adjustmentFactor,
        });
      }
    });
  }

  function handleAdjustmentChange(factor: number) {
    startTransition(() => {
      if (row.sourceType === "cable") {
        updateCable(row.id, { adjustmentFactor: factor });
      } else if (row.sourceType === "equipment") {
        updateEquipment(row.id, { adjustmentFactor: factor });
      } else {
        updateScopeItem(row.id, { adjustmentFactor: factor });
      }
    });
  }

  function handleDelete() {
    startTransition(() => {
      onDelete();
    });
  }

  const colorClass = getAdjustmentColor(row.adjustmentFactor);

  return (
    <tr
      className={`border-b last:border-0 hover:bg-muted/20 ${isPending ? "opacity-50" : ""}`}
    >
      <td className="px-3 py-2 font-medium max-w-xs truncate text-sm">
        {row.description}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[120px] truncate">
        {row.normName || "-"}
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-7 w-16 text-right font-mono text-xs"
          type="number"
          step="0.1"
          defaultValue={row.quantity}
          onBlur={(e) => handleQuantityBlur(e.target.value)}
        />
      </td>
      <td className="px-3 py-2 text-xs">{row.unit}</td>
      <td className="px-3 py-2 text-right font-mono text-xs">
        {row.hoursPerUnit > 0 ? row.hoursPerUnit.toFixed(3) : "-"}
      </td>
      <td className="px-3 py-2">
        <AdjustmentFactorSelect
          value={row.adjustmentFactor}
          onValueChange={handleAdjustmentChange}
          className="w-20"
        />
      </td>
      <td className={`px-3 py-2 text-right font-mono text-xs ${colorClass}`}>
        {row.adjustedHoursPerUnit > 0
          ? row.adjustedHoursPerUnit.toFixed(3)
          : "-"}
      </td>
      <td className="px-3 py-2 text-right font-mono font-medium text-sm">
        {row.totalHours > 0 ? row.totalHours.toFixed(1) : "-"}
      </td>
      <td className="px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleDelete}
          title="Slett"
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}

function AddLineFromNorm({
  estimateId,
  normCategories,
}: {
  estimateId: string;
  normCategories: NormCategory[];
}) {
  const [isPending, startTransition] = useTransition();
  const [normId, setNormId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [factor, setFactor] = useState(1.0);

  const selectedNorm = useMemo(() => {
    if (!normId) return null;
    for (const cat of normCategories) {
      const norm = cat.norms.find((n) => n.id === normId);
      if (norm) return { ...norm, catName: cat.name };
    }
    return null;
  }, [normId, normCategories]);

  function handleAdd() {
    if (!normId) return;
    const qty = parseFloat(quantity) || 1;
    startTransition(async () => {
      await addCalculatorLine(estimateId, {
        normId,
        quantity: qty,
        adjustmentFactor: factor,
      });
      setNormId(null);
      setQuantity("1");
      setFactor(1.0);
    });
  }

  const previewHours =
    selectedNorm && quantity
      ? parseFloat(quantity) * selectedNorm.hoursPerUnit * factor
      : null;

  return (
    <tr className="border-t bg-muted/20">
      <td className="px-3 py-2" colSpan={2}>
        <Select
          value={normId || ""}
          onValueChange={(v: string | null) => setNormId(v || null)}
        >
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue placeholder="Velg norm fra database..." />
          </SelectTrigger>
          <SelectContent>
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
          className="h-7 w-16 text-right font-mono text-xs"
          type="number"
          step="0.1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </td>
      <td className="px-3 py-2 text-xs">{selectedNorm?.unit || ""}</td>
      <td className="px-3 py-2 text-right font-mono text-xs">
        {selectedNorm?.hoursPerUnit.toFixed(3) || ""}
      </td>
      <td className="px-3 py-2">
        <AdjustmentFactorSelect
          value={factor}
          onValueChange={setFactor}
          className="w-20"
        />
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs">
        {selectedNorm
          ? (selectedNorm.hoursPerUnit * factor).toFixed(3)
          : ""}
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
        {previewHours !== null ? previewHours.toFixed(1) : ""}
      </td>
      <td className="px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleAdd}
          disabled={isPending || !normId}
          title="Legg til"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </td>
    </tr>
  );
}

export function EstimateCalculatorTab({
  estimate,
  normCategories,
}: {
  estimate: Estimate;
  normCategories: NormCategory[];
}) {
  const normsBySizeAndCategory = useMemo(() => {
    const map = new Map<string, { name: string; hoursPerUnit: number }>();
    for (const cat of normCategories) {
      for (const norm of cat.norms) {
        if (norm.sizeRange) {
          map.set(`${cat.name}|${norm.sizeRange}`, {
            name: `${cat.name} - ${norm.name}`,
            hoursPerUnit: norm.hoursPerUnit,
          });
        }
      }
    }
    return map;
  }, [normCategories]);

  const rows = useMemo(() => {
    const result: CalcRow[] = [];

    for (const cable of estimate.cables) {
      const sizeCategory = cable.sizeCategory || "< 6mm2";
      const norm =
        normsBySizeAndCategory.get(`Kabelinstallasjon|${sizeCategory}`) ||
        normsBySizeAndCategory.get(`Kabelinstallasjon|< 6mm2`);
      const hpu = norm?.hoursPerUnit || 0;
      const factor = cable.adjustmentFactor ?? 1.0;

      result.push({
        id: cable.id,
        description: `${cable.tagNumber ? cable.tagNumber + " - " : ""}${cable.cableType}`,
        normName: norm?.name || null,
        quantity: cable.lengthMeters,
        unit: "m",
        hoursPerUnit: hpu,
        adjustmentFactor: factor,
        adjustedHoursPerUnit: hpu * factor,
        totalHours: cable.lengthMeters * hpu * factor,
        section: "Kabelinstallasjon",
        discipline: "ELECTRICAL",
        sourceType: "cable",
      });
    }

    for (const equip of estimate.equipment) {
      const factor = equip.adjustmentFactor ?? 1.0;
      result.push({
        id: equip.id,
        description: `${equip.tagNumber ? equip.tagNumber + " - " : ""}${equip.name} (${equip.action})`,
        normName: equip.type,
        quantity: equip.quantity,
        unit: "stk",
        hoursPerUnit: 0,
        adjustmentFactor: factor,
        adjustedHoursPerUnit: 0,
        totalHours: 0,
        section: "Utstyrsinstallasjon",
        discipline: "ELECTRICAL",
        sourceType: "equipment",
      });
    }

    for (const item of estimate.scopeItems) {
      const hpu = item.hoursPerUnit || 0;
      const factor = item.adjustmentFactor;
      const section =
        item.discipline === "ENGINEERING"
          ? "Engineering"
          : item.discipline === "INSTRUMENT"
            ? "Instrumentering"
            : "Diverse arbeider";

      result.push({
        id: item.id,
        description: item.description,
        normName: item.normId ? "Fra norm" : "Manuell",
        quantity: item.quantity,
        unit: item.unit,
        hoursPerUnit: hpu,
        adjustmentFactor: factor,
        adjustedHoursPerUnit: hpu * factor,
        totalHours: item.totalHours || item.quantity * hpu * factor,
        section,
        discipline: item.discipline,
        sourceType: "scope",
      });
    }

    return result;
  }, [estimate.cables, estimate.equipment, estimate.scopeItems, normsBySizeAndCategory]);

  const sections = useMemo(() => {
    const sectionOrder = [
      "Kabelinstallasjon",
      "Utstyrsinstallasjon",
      "Diverse arbeider",
      "Instrumentering",
      "Engineering",
    ];
    const grouped = new Map<string, CalcRow[]>();
    for (const row of rows) {
      const existing = grouped.get(row.section) || [];
      existing.push(row);
      grouped.set(row.section, existing);
    }
    return sectionOrder
      .filter((s) => grouped.has(s))
      .map((s) => ({ name: s, rows: grouped.get(s)! }));
  }, [rows]);

  const grandTotalHours = rows.reduce((s, r) => s + r.totalHours, 0);

  function handleDeleteRow(row: CalcRow) {
    if (row.sourceType === "cable") deleteCable(row.id);
    else if (row.sourceType === "equipment") deleteEquipment(row.id);
    else deleteScopeItem(row.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Kalkyle
        </h3>
        <span className="text-sm font-medium">
          Totalt: {grandTotalHours.toFixed(1)} timer
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-3 text-left font-medium">Beskrivelse</th>
                  <th className="px-3 py-3 text-left font-medium">Norm</th>
                  <th className="px-3 py-3 text-right font-medium">Antall</th>
                  <th className="px-3 py-3 text-left font-medium">Enhet</th>
                  <th className="px-3 py-3 text-right font-medium">T/enhet</th>
                  <th className="px-3 py-3 text-center font-medium">Tilkomst</th>
                  <th className="px-3 py-3 text-right font-medium">Just. T/e</th>
                  <th className="px-3 py-3 text-right font-medium">Timer</th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => {
                  const sectionTotal = section.rows.reduce(
                    (s, r) => s + r.totalHours,
                    0
                  );
                  return (
                    <SectionGroup
                      key={section.name}
                      name={section.name}
                      rows={section.rows}
                      sectionTotal={sectionTotal}
                      onDeleteRow={handleDeleteRow}
                    />
                  );
                })}
                <AddLineFromNorm
                  estimateId={estimate.id}
                  normCategories={normCategories}
                />
              </tbody>
              <tfoot>
                <tr className="bg-primary/5 font-bold border-t-2">
                  <td colSpan={7} className="px-3 py-3 text-right">
                    Grand total:
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {grandTotalHours.toFixed(1)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Kostnadssammendrag</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Arbeidstimer totalt</span>
              <span className="font-mono font-medium">{estimate.totalLaborHours.toFixed(1)} t</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between">
              <span>Arbeidskostnad</span>
              <span className="font-mono font-medium">{formatNOK(estimate.totalLaborCost)}</span>
            </div>
            <div className="flex justify-between">
              <span>Materialkostnad (inkl. {estimate.markupPercent}% paslag)</span>
              <span className="font-mono font-medium">{formatNOK(estimate.totalMaterialCost)}</span>
            </div>
            {estimate.contingencyPercent > 0 && (
              <div className="flex justify-between">
                <span>Reserve ({estimate.contingencyPercent}%)</span>
                <span className="font-mono font-medium">
                  {formatNOK((estimate.totalLaborCost + estimate.totalMaterialCost) * (estimate.contingencyPercent / 100))}
                </span>
              </div>
            )}
            {estimate.mobDemobCost > 0 && (
              <div className="flex justify-between">
                <span>Mob/Demob</span>
                <span className="font-mono font-medium">{formatNOK(estimate.mobDemobCost)}</span>
              </div>
            )}
            {estimate.equipmentRentalCost > 0 && (
              <div className="flex justify-between">
                <span>Utstyrsleie</span>
                <span className="font-mono font-medium">{formatNOK(estimate.equipmentRentalCost)}</span>
              </div>
            )}
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>TOTALT</span>
              <span className="font-mono">{formatNOK(estimate.totalCost)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionGroup({
  name,
  rows,
  sectionTotal,
  onDeleteRow,
}: {
  name: string;
  rows: CalcRow[];
  sectionTotal: number;
  onDeleteRow: (row: CalcRow) => void;
}) {
  return (
    <>
      <tr className="bg-muted/30 border-b">
        <td colSpan={9} className="px-3 py-2 font-semibold text-xs uppercase tracking-wide">
          {name} ({rows.length})
        </td>
      </tr>
      {rows.map((row) => (
        <EditableCalcRow
          key={row.id}
          row={row}
          onDelete={() => onDeleteRow(row)}
        />
      ))}
      <tr className="bg-muted/20 border-b font-medium">
        <td colSpan={7} className="px-3 py-2 text-right text-xs">
          Deltotal {name}:
        </td>
        <td className="px-3 py-2 text-right font-mono text-xs">
          {sectionTotal.toFixed(1)}
        </td>
        <td />
      </tr>
    </>
  );
}
