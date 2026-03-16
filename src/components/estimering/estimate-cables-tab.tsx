"use client";

import { useTransition, useState } from "react";
import { ConfidenceBadge } from "./confidence-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Cable, Check, Trash2, Plus } from "lucide-react";
import { AdjustmentFactorSelect } from "./adjustment-factor-select";
import {
  updateCable,
  deleteCable,
  addCable,
} from "@/app/(authenticated)/estimering/[id]/actions";

type EstimateCable = {
  id: string;
  tagNumber: string | null;
  cableType: string;
  fromLocation: string | null;
  toLocation: string | null;
  lengthMeters: number;
  sizeCategory: string | null;
  adjustmentFactor: number | null;
  aiConfidence: number | null;
  verified: boolean;
};

function CableRow({ cable }: { cable: EstimateCable }) {
  const [isPending, startTransition] = useTransition();

  function handleVerify() {
    startTransition(() => {
      updateCable(cable.id, { verified: true });
    });
  }

  function handleDelete() {
    startTransition(() => {
      deleteCable(cable.id);
    });
  }

  function handleBlur(field: string, value: string) {
    const update: Record<string, string | number> = {};
    if (field === "lengthMeters") {
      const num = parseFloat(value);
      if (!isNaN(num) && num !== cable.lengthMeters) update[field] = num;
    } else {
      const original = (cable as Record<string, unknown>)[field] ?? "";
      if (value !== original) update[field] = value;
    }
    if (Object.keys(update).length > 0) {
      startTransition(() => {
        updateCable(cable.id, update);
      });
    }
  }

  function handleAdjustmentChange(value: number) {
    startTransition(() => {
      updateCable(cable.id, { adjustmentFactor: value });
    });
  }

  function handleSizeChange(value: string | null) {
    if (value && value !== cable.sizeCategory) {
      startTransition(() => {
        updateCable(cable.id, { sizeCategory: value });
      });
    }
  }

  return (
    <tr className={`border-b last:border-0 ${isPending ? "opacity-50" : ""} ${!cable.verified ? "bg-amber-50/50" : ""}`}>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-24 font-mono text-xs"
          defaultValue={cable.tagNumber || ""}
          onBlur={(e) => handleBlur("tagNumber", e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-48 text-sm font-medium"
          defaultValue={cable.cableType}
          onBlur={(e) => handleBlur("cableType", e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-28 text-sm"
          defaultValue={cable.fromLocation || ""}
          onBlur={(e) => handleBlur("fromLocation", e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-28 text-sm"
          defaultValue={cable.toLocation || ""}
          onBlur={(e) => handleBlur("toLocation", e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-20 text-right font-mono text-sm"
          type="number"
          step="0.1"
          defaultValue={cable.lengthMeters}
          onBlur={(e) => handleBlur("lengthMeters", e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Select defaultValue={cable.sizeCategory || "< 6mm2"} onValueChange={handleSizeChange}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="< 6mm2">{"< 6mm2"}</SelectItem>
            <SelectItem value="6-50mm2">6-50mm2</SelectItem>
            <SelectItem value="> 50mm2">{"> 50mm2"}</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <AdjustmentFactorSelect
          value={cable.adjustmentFactor ?? 1.0}
          onValueChange={handleAdjustmentChange}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <ConfidenceBadge confidence={cable.aiConfidence} verified={cable.verified} />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          {!cable.verified && (
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

function AddCableRow({ estimateId }: { estimateId: string }) {
  const [isPending, startTransition] = useTransition();
  const [tag, setTag] = useState("");
  const [cableType, setCableType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [length, setLength] = useState("");
  const [size, setSize] = useState("< 6mm2");
  const [factor, setFactor] = useState(1.0);

  function handleAdd() {
    if (!cableType.trim() || !length) return;
    startTransition(async () => {
      await addCable(estimateId, {
        tagNumber: tag || undefined,
        cableType: cableType.trim(),
        fromLocation: from || undefined,
        toLocation: to || undefined,
        lengthMeters: parseFloat(length),
        sizeCategory: size,
      });
      setTag("");
      setCableType("");
      setFrom("");
      setTo("");
      setLength("");
      setFactor(1.0);
    });
  }

  return (
    <tr className="border-t bg-muted/20">
      <td className="px-3 py-2">
        <Input className="h-8 w-24 font-mono text-xs" placeholder="Merke" value={tag} onChange={(e) => setTag(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 w-48 text-sm" placeholder="Kabeltype *" value={cableType} onChange={(e) => setCableType(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 w-28 text-sm" placeholder="Fra" value={from} onChange={(e) => setFrom(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 w-28 text-sm" placeholder="Til" value={to} onChange={(e) => setTo(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input className="h-8 w-20 text-right font-mono text-sm" type="number" step="0.1" placeholder="0" value={length} onChange={(e) => setLength(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Select value={size} onValueChange={(v: string | null) => { if (v) setSize(v); }}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="< 6mm2">{"< 6mm2"}</SelectItem>
            <SelectItem value="6-50mm2">6-50mm2</SelectItem>
            <SelectItem value="> 50mm2">{"> 50mm2"}</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <AdjustmentFactorSelect value={factor} onValueChange={setFactor} />
      </td>
      <td />
      <td className="px-3 py-2">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleAdd} disabled={isPending || !cableType.trim() || !length} title="Legg til">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

export function EstimateCablesTab({ cables, estimateId }: { cables: EstimateCable[]; estimateId: string }) {
  if (cables.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Cable className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Ingen kabler</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Kabler vil vises her etter AI-analyse eller manuell registrering.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Kabler ({cables.length})</h3>
        <span className="text-sm text-muted-foreground">
          {cables.filter((c) => c.verified).length} av {cables.length} verifisert
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-3 text-left font-medium">Merke</th>
                  <th className="px-3 py-3 text-left font-medium">Kabeltype</th>
                  <th className="px-3 py-3 text-left font-medium">Fra</th>
                  <th className="px-3 py-3 text-left font-medium">Til</th>
                  <th className="px-3 py-3 text-right font-medium">Lengde (m)</th>
                  <th className="px-3 py-3 text-left font-medium">Storrelse</th>
                  <th className="px-3 py-3 text-center font-medium">Tilkomst</th>
                  <th className="px-3 py-3 text-center font-medium">Status</th>
                  <th className="px-3 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {cables.map((cable) => (
                  <CableRow key={cable.id} cable={cable} />
                ))}
                <AddCableRow estimateId={estimateId} />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Sammendrag</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Antall kabler</dt>
              <dd className="text-lg font-bold">{cables.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total lengde</dt>
              <dd className="text-lg font-bold">
                {cables.reduce((sum, c) => sum + c.lengthMeters, 0).toFixed(1)} m
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Verifisert</dt>
              <dd className="text-lg font-bold">
                {cables.filter((c) => c.verified).length} / {cables.length}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
