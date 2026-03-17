"use client";

import { useUpdateSearchParam } from "@/hooks/use-search-param";
import type { Department } from "@/lib/queries/personnel";

interface SkjemaFiltersProps {
  departments: Department[];
}

export function SkjemaFilters({ departments }: SkjemaFiltersProps) {
  const { updateParam, searchParams } = useUpdateSearchParam();

  if (departments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      <select
        className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
        defaultValue={searchParams.get("department") ?? ""}
        onChange={(e) => updateParam("department", e.target.value)}
      >
        <option value="">Alle avdelinger</option>
        {departments.map((dept) => (
          <option key={dept.value} value={dept.value}>
            {dept.label}
          </option>
        ))}
      </select>
    </div>
  );
}
