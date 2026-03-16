"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

type Product = {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  unitName: string;
  priceOre: number;
  classification: string | null;
  manufacturer: string | null;
  stocked: boolean;
};

const formatNOK = (ore: number) =>
  new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 2,
  }).format(ore / 100);

export function ProductCatalog({
  products,
  totalCount,
  totalPages,
  currentPage,
  query,
}: {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  query: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(query);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      params.set("q", searchInput.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Sok pa produktnavn, ID eller beskrivelse..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit">Sok</Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">
                    Produkt-ID
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Navn</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Beskrivelse
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Enhet</th>
                  <th className="px-4 py-3 text-right font-medium">Pris</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Klassifisering
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Leverandor
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Lager</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {product.productId}
                    </td>
                    <td className="px-4 py-3 font-medium max-w-xs truncate">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {product.description || "-"}
                    </td>
                    <td className="px-4 py-3">{product.unitName}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {formatNOK(product.priceOre)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {product.classification || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {product.manufacturer || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {product.stocked ? (
                        <Badge
                          variant="outline"
                          className="text-green-700 border-green-300 bg-green-50 text-xs"
                        >
                          Ja
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Nei
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      {query
                        ? "Ingen produkter funnet"
                        : "Ingen produkter i databasen"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Viser {(currentPage - 1) * 50 + 1}-
            {Math.min(currentPage * 50, totalCount)} av{" "}
            {totalCount.toLocaleString("nb-NO")}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Side {currentPage} av {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
