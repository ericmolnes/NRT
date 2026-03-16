"use client";

import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface EvaluationFiltersProps {
  rigs: string[];
}

export function EvaluationFilters({ rigs }: EvaluationFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex gap-4">
      <Input
        placeholder="Søk etter navn..."
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => updateParam("search", e.target.value)}
        className="max-w-sm"
      />
      {rigs.length > 0 && (
        <select
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          defaultValue={searchParams.get("rig") ?? ""}
          onChange={(e) => updateParam("rig", e.target.value)}
        >
          <option value="">Alle rigger</option>
          {rigs.map((rig) => (
            <option key={rig} value={rig}>
              {rig}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
