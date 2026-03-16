"use client";

import { useMemo } from "react";
import type { LabelDef } from "./allocation-color-map";
import { getLabelStyle } from "./allocation-color-map";

interface Allocation {
  startDate: string | Date;
  endDate: string | Date;
  label: string;
}

interface Entry {
  id: string;
  allocations: Allocation[];
}

interface GridSummaryProps {
  entries: Entry[];
  dates: string[];
  colorMap: Map<string, LabelDef>;
}

export function GridSummary({ entries, dates, colorMap }: GridSummaryProps) {
  const periodTotals = useMemo(() => {
    const totals = new Map<string, number>();
    const dateSet = new Set(dates);

    for (const entry of entries) {
      for (const alloc of entry.allocations) {
        const start = new Date(alloc.startDate);
        const end = new Date(alloc.endDate);
        const cursor = new Date(start);
        while (cursor <= end) {
          const key = cursor.toISOString().split("T")[0];
          if (dateSet.has(key)) {
            totals.set(alloc.label, (totals.get(alloc.label) ?? 0) + 1);
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }

    return Array.from(totals.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12);
  }, [entries, dates]);

  return (
    <div className="p-3 bg-gray-50 border-t flex items-center gap-4 flex-wrap text-xs">
      <span className="font-medium text-gray-700">Oppsummering:</span>
      <span className="text-gray-600">{entries.length} personer</span>
      {periodTotals.map(([labelName, count]) => {
        const labelDef = getLabelStyle(labelName, colorMap);
        return (
          <div key={labelName} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: labelDef.color }}
            />
            <span>{labelName}: {count} dagsverk</span>
          </div>
        );
      })}
    </div>
  );
}
