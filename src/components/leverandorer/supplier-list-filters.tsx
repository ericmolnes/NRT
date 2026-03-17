"use client";

import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";

export function SupplierListFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateFilter = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`/leverandorer?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Søk leverandør..."
          className="h-9 pl-9 text-sm"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => updateFilter("search", e.target.value)}
        />
      </div>
      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        defaultValue={searchParams.get("type") ?? ""}
        onChange={(e) => updateFilter("type", e.target.value)}
      >
        <option value="">Alle typer</option>
        <option value="MATERIAL">Materiell</option>
        <option value="SERVICE">Tjeneste</option>
        <option value="EQUIPMENT">Utstyr</option>
        <option value="RENTAL">Utleie</option>
      </select>
      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => updateFilter("status", e.target.value)}
      >
        <option value="">Alle statuser</option>
        <option value="PENDING">Venter</option>
        <option value="APPROVED">Godkjent</option>
        <option value="CONDITIONAL">Betinget</option>
        <option value="REJECTED">Avvist</option>
        <option value="EXPIRED">Utløpt</option>
      </select>
    </div>
  );
}
