"use client";

import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface PersonnelFiltersProps {
  departments: string[];
}

export function PersonnelFilters({ departments }: PersonnelFiltersProps) {
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
    <div className="flex flex-wrap gap-4">
      <Input
        placeholder="Søk etter navn..."
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => updateParam("search", e.target.value)}
        className="max-w-sm"
      />
      {departments.length > 0 && (
        <select
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
          defaultValue={searchParams.get("department") ?? ""}
          onChange={(e) => updateParam("department", e.target.value)}
        >
          <option value="">Alle avdelinger</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      )}
      <select
        className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="">Aktive</option>
        <option value="INACTIVE">Inaktive</option>
        <option value="ARCHIVED">Arkiverte</option>
      </select>
      <select
        className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
        defaultValue={searchParams.get("sync") ?? ""}
        onChange={(e) => updateParam("sync", e.target.value)}
      >
        <option value="">Alle koblinger</option>
        <option value="po">PowerOffice-koblet</option>
        <option value="recman">Recman-koblet</option>
        <option value="unlinked">Ikke koblet</option>
      </select>
    </div>
  );
}
