"use client";

import { useState, useTransition } from "react";
import { ConfidenceBadge } from "./confidence-badge";
import { ProductSearchModal } from "./product-search-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Package, Check, Trash2, Search, Plus } from "lucide-react";
import {
  updateLineItem,
  deleteLineItem,
  addLineItem,
} from "@/app/(authenticated)/estimering/[id]/actions";

type EstimateLineItem = {
  id: string;
  description: string;
  productId: string | null;
  product: {
    productId: string;
    name: string;
    unitName: string;
  } | null;
  quantity: number;
  unit: string;
  unitPriceNOK: number | null;
  totalPriceNOK: number | null;
  aiConfidence: number | null;
  verified: boolean;
};

const formatNOK = (amount: number) =>
  new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 2,
  }).format(amount);

function MaterialRow({ item }: { item: EstimateLineItem }) {
  const [isPending, startTransition] = useTransition();

  function handleVerify() {
    startTransition(() => {
      updateLineItem(item.id, { verified: true });
    });
  }

  function handleDelete() {
    startTransition(() => {
      deleteLineItem(item.id);
    });
  }

  function handleBlur(field: string, value: string) {
    const numFields = ["quantity", "unitPriceNOK"];
    const update: Record<string, unknown> = {};

    if (numFields.includes(field)) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        const original = (item as Record<string, unknown>)[field];
        if (num !== original) {
          update[field] = num;
          if (field === "quantity" && item.unitPriceNOK) {
            update.totalPriceNOK = num * item.unitPriceNOK;
          } else if (field === "unitPriceNOK") {
            update.totalPriceNOK = item.quantity * num;
          }
        }
      }
    } else {
      const original = (item as Record<string, unknown>)[field] ?? "";
      if (value !== original) update[field] = value;
    }

    if (Object.keys(update).length > 0) {
      startTransition(() => {
        updateLineItem(item.id, update as Parameters<typeof updateLineItem>[1]);
      });
    }
  }

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
      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
        {item.product?.productId || "-"}
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-16 text-right font-mono text-sm"
          type="number"
          step="1"
          defaultValue={item.quantity}
          onBlur={(e) => handleBlur("quantity", e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-16 text-sm"
          defaultValue={item.unit}
          onBlur={(e) => handleBlur("unit", e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-24 text-right font-mono text-sm"
          type="number"
          step="0.01"
          defaultValue={item.unitPriceNOK ?? ""}
          onBlur={(e) => handleBlur("unitPriceNOK", e.target.value)}
        />
      </td>
      <td className="px-3 py-2 text-right font-mono font-medium">
        {item.totalPriceNOK ? formatNOK(item.totalPriceNOK) : "-"}
      </td>
      <td className="px-3 py-2 text-center">
        <ConfidenceBadge
          confidence={item.aiConfidence}
          verified={item.verified}
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          {!item.verified && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleVerify}
              title="Verifiser"
            >
              <Check className="h-3.5 w-3.5 text-green-600" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleDelete}
            title="Slett"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AddManualRow({ estimateId }: { estimateId: string }) {
  const [isPending, startTransition] = useTransition();
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("stk");
  const [price, setPrice] = useState("");

  function handleAdd() {
    if (!desc.trim()) return;
    const q = parseFloat(qty) || 1;
    const p = parseFloat(price) || undefined;

    startTransition(async () => {
      await addLineItem(estimateId, {
        description: desc.trim(),
        quantity: q,
        unit,
        unitPriceNOK: p,
      });
      setDesc("");
      setQty("1");
      setPrice("");
    });
  }

  return (
    <tr className="border-t bg-muted/20">
      <td className="px-3 py-2">
        <Input
          className="h-8 w-full min-w-[180px] text-sm"
          placeholder="Manuell post..."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">-</td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-16 text-right font-mono text-sm"
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-16 text-sm"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-24 text-right font-mono text-sm"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </td>
      <td className="px-3 py-2 text-right font-mono text-sm text-muted-foreground">
        {price && qty
          ? formatNOK(parseFloat(qty) * parseFloat(price))
          : "-"}
      </td>
      <td />
      <td className="px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleAdd}
          disabled={isPending || !desc.trim()}
          title="Legg til"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

export function EstimateMaterialsTab({
  lineItems,
  estimateId,
}: {
  lineItems: EstimateLineItem[];
  estimateId: string;
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  if (lineItems.length === 0 && !estimateId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Ingen materialer</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Materialer vil vises her etter AI-analyse eller manuell
            registrering.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalCost = lineItems.reduce(
    (sum, item) => sum + (item.totalPriceNOK || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Materialer ({lineItems.length})
        </h3>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            Sok i katalog
          </Button>
          <span className="text-sm text-muted-foreground">
            {lineItems.filter((l) => l.verified).length} av{" "}
            {lineItems.length} verifisert
          </span>
          <span className="text-sm font-medium">
            Totalt: {formatNOK(totalCost)}
          </span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-3 text-left font-medium">Produkt</th>
                  <th className="px-3 py-3 text-left font-medium">
                    Katalog-ID
                  </th>
                  <th className="px-3 py-3 text-right font-medium">Antall</th>
                  <th className="px-3 py-3 text-left font-medium">Enhet</th>
                  <th className="px-3 py-3 text-right font-medium">
                    Enhetspris
                  </th>
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-3 py-3 text-center font-medium">Status</th>
                  <th className="px-3 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <MaterialRow key={item.id} item={item} />
                ))}
                <AddManualRow estimateId={estimateId} />
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td colSpan={5} className="px-3 py-3 text-right">
                    Totalt materialkostnad:
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatNOK(totalCost)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <ProductSearchModal
        estimateId={estimateId}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
