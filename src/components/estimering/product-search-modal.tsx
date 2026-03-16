"use client";

import { useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Plus, X, Loader2, Package } from "lucide-react";
import {
  searchProductsAction,
  addLineItemFromProduct,
} from "@/app/(authenticated)/estimering/[id]/actions";

type Product = {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  unitName: string;
  priceOre: number;
  classification: string | null;
};

function oreToNOK(ore: number): number {
  return ore / 100;
}

export function ProductSearchModal({
  estimateId,
  open,
  onClose,
}: {
  estimateId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, startSearch] = useTransition();
  const [isAdding, startAdd] = useTransition();
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const doSearch = useCallback(
    (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      startSearch(async () => {
        const products = await searchProductsAction(q);
        setResults(products as unknown as Product[]);
      });
    },
    []
  );

  function handleSearchInput(value: string) {
    setQuery(value);
    const timeout = setTimeout(() => doSearch(value), 300);
    return () => clearTimeout(timeout);
  }

  function handleAdd(product: Product) {
    const qty = parseFloat(quantities[product.id] || "1") || 1;
    const priceNOK = oreToNOK(product.priceOre);
    startAdd(async () => {
      await addLineItemFromProduct(estimateId, {
        productId: product.id,
        description: product.name,
        quantity: qty,
        unit: product.unitName,
        unitPriceNOK: priceNOK,
      });
      setResults((prev) => prev.filter((p) => p.id !== product.id));
    });
  }

  if (!open) return null;

  const formatNOK = (amount: number) =>
    new Intl.NumberFormat("nb-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 2,
    }).format(amount);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <Card className="w-full max-w-3xl max-h-[70vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Sok i produktkatalog</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Sok pa produktnavn, ID eller beskrivelse..."
              value={query}
              onChange={(e) => handleSearchInput(e.target.value)}
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {results.length === 0 && query.length >= 2 && !isSearching ? (
              <div className="py-8 text-center text-muted-foreground">
                <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Ingen produkter funnet</p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm">
                  Skriv minst 2 tegn for a soke...
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 sticky top-0">
                    <th className="px-3 py-2 text-left font-medium">
                      Produkt-ID
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Navn</th>
                    <th className="px-3 py-2 text-left font-medium">Enhet</th>
                    <th className="px-3 py-2 text-right font-medium">Pris</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Antall
                    </th>
                    <th className="px-3 py-2 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {results.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {product.productId}
                      </td>
                      <td className="px-3 py-2 max-w-xs">
                        <div className="font-medium truncate">
                          {product.name}
                        </div>
                        {product.classification && (
                          <div className="text-xs text-muted-foreground">
                            {product.classification}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">{product.unitName}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {product.priceOre
                          ? formatNOK(oreToNOK(product.priceOre))
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-7 w-16 text-right font-mono text-xs"
                          type="number"
                          min="1"
                          step="1"
                          defaultValue="1"
                          onChange={(e) =>
                            setQuantities((prev) => ({
                              ...prev,
                              [product.id]: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleAdd(product)}
                          disabled={isAdding}
                          title="Legg til"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
