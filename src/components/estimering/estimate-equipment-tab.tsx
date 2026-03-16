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
import { Wrench, Check, Trash2, Plus } from "lucide-react";
import {
  updateEquipment,
  deleteEquipment,
  addEquipment,
} from "@/app/(authenticated)/estimering/[id]/actions";

type EstimateEquipment = {
  id: string;
  tagNumber: string | null;
  name: string;
  type: string;
  action: string;
  quantity: number;
  adjustmentFactor: number | null;
  aiConfidence: number | null;
  verified: boolean;
};

const equipmentTypes = [
  "JUNCTION_BOX", "LIGHT_FIXTURE", "INSTRUMENT", "PANEL",
  "CABLE_TRAY", "MCT", "SENSOR", "HORN", "SWITCH",
  "OUTLET", "BATTERY", "OTHER",
];

const actionOptions = [
  { value: "INSTALL", label: "Installere" },
  { value: "REMOVE", label: "Demontere" },
  { value: "MODIFY", label: "Modifisere" },
  { value: "RELOCATE", label: "Flytte" },
];

function EquipmentRow({ item }: { item: EstimateEquipment }) {
  const [isPending, startTransition] = useTransition();

  function handleVerify() {
    startTransition(() => { updateEquipment(item.id, { verified: true }); });
  }

  function handleDelete() {
    startTransition(() => { deleteEquipment(item.id); });
  }

  function handleBlur(field: string, value: string) {
    const update: Record<string, string | number> = {};
    if (field === "quantity") {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num !== item.quantity) update[field] = num;
    } else {
      const original = (item as Record<string, unknown>)[field] ?? "";
      if (value !== original) update[field] = value;
    }
    if (Object.keys(update).length > 0) {
      startTransition(() => { updateEquipment(item.id, update); });
    }
  }

  function handleSelectChange(field: string, value: string | null) {
    if (value && value !== (item as Record<string, unknown>)[field]) {
      startTransition(() => { updateEquipment(item.id, { [field]: value }); });
    }
  }

  function handleAdjustmentChange(value: number) {
    startTransition(() => {
      updateEquipment(item.id, { adjustmentFactor: value });
    });
  }

  return (
    <tr className={`border-b last:border-0 ${isPending ? "opacity-50" : ""} ${!item.verified ? "bg-amber-50/50" : ""}`}>
      <td className="px-3 py-2">
        <Input className="h-8 w-24 font-mono text-xs" defaultValue={item.tagNumber || ""} onBlur={(e) => handleBlur("tagNumber", e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 w-48 text-sm font-medium" defaultValue={item.name} onBlur={(e) => handleBlur("name", e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Select defaultValue={item.type} onValueChange={(v) => handleSelectChange("type", v)}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {equipmentTypes.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Select defaultValue={item.action} onValueChange={(v) => handleSelectChange("action", v)}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {actionOptions.map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 w-16 text-right font-mono text-sm" type="number" min="1" defaultValue={item.quantity} onBlur={(e) => handleBlur("quantity", e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <AdjustmentFactorSelect
          value={item.adjustmentFactor ?? 1.0}
          onValueChange={handleAdjustmentChange}
        />
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

function AddEquipmentRow({ estimateId }: { estimateId: string }) {
  const [isPending, startTransition] = useTransition();
  const [tag, setTag] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("JUNCTION_BOX");
  const [action, setAction] = useState("INSTALL");
  const [qty, setQty] = useState("1");

  function handleAdd() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addEquipment(estimateId, {
        tagNumber: tag || undefined,
        name: name.trim(),
        type,
        action,
        quantity: parseInt(qty, 10) || 1,
      });
      setTag("");
      setName("");
      setQty("1");
    });
  }

  return (
    <tr className="border-t bg-muted/20">
      <td className="px-3 py-2">
        <Input className="h-8 w-24 font-mono text-xs" placeholder="Merke" value={tag} onChange={(e) => setTag(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 w-48 text-sm" placeholder="Navn *" value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Select value={type} onValueChange={(v: string | null) => { if (v) setType(v); }}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {equipmentTypes.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Select value={action} onValueChange={(v: string | null) => { if (v) setAction(v); }}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {actionOptions.map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 w-16 text-right font-mono text-sm" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
      </td>
      <td />
      <td />
      <td className="px-3 py-2">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleAdd} disabled={isPending || !name.trim()} title="Legg til">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

export function EstimateEquipmentTab({ equipment, estimateId }: { equipment: EstimateEquipment[]; estimateId: string }) {
  if (equipment.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Wrench className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Ingen utstyr</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Utstyr vil vises her etter AI-analyse eller manuell registrering.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Utstyr ({equipment.length})</h3>
        <span className="text-sm text-muted-foreground">
          {equipment.filter((e) => e.verified).length} av {equipment.length} verifisert
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-3 text-left font-medium">Merke</th>
                  <th className="px-3 py-3 text-left font-medium">Navn</th>
                  <th className="px-3 py-3 text-left font-medium">Type</th>
                  <th className="px-3 py-3 text-left font-medium">Aksjon</th>
                  <th className="px-3 py-3 text-right font-medium">Antall</th>
                  <th className="px-3 py-3 text-center font-medium">Tilkomst</th>
                  <th className="px-3 py-3 text-center font-medium">Status</th>
                  <th className="px-3 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => (<EquipmentRow key={item.id} item={item} />))}
                <AddEquipmentRow estimateId={estimateId} />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
