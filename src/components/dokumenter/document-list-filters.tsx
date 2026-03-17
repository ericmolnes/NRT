"use client";

import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";

export function DocumentListFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateFilter = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`/dokumenter?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Søk dokument..."
          className="h-9 pl-9 text-sm"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => updateFilter("search", e.target.value)}
        />
      </div>
      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        defaultValue={searchParams.get("category") ?? ""}
        onChange={(e) => updateFilter("category", e.target.value)}
      >
        <option value="">Alle kategorier</option>
        <option value="PROCEDURE">Prosedyre</option>
        <option value="WORK_INSTRUCTION">Arbeidsinstruks</option>
        <option value="FORM_TEMPLATE">Skjema/Mal</option>
        <option value="POLICY">Retningslinje</option>
        <option value="RECORD">Registrering</option>
        <option value="EXTERNAL">Eksternt</option>
      </select>
    </div>
  );
}
