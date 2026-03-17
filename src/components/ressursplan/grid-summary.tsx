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
  const todayStr = new Date().toISOString().split("T")[0];

  const { periodTotals, assignedCount, availableCount } = useMemo(() => {
    const totals = new Map<string, number>();
    const dateSet = new Set(dates);
    let assigned = 0;
    let available = 0;

    for (const entry of entries) {
      let hasToday = false;
      for (const alloc of entry.allocations) {
        const start = new Date(alloc.startDate);
        const end = new Date(alloc.endDate);
        const cursor = new Date(start);
        while (cursor <= end) {
          const key = cursor.toISOString().split("T")[0];
          if (dateSet.has(key)) {
            totals.set(alloc.label, (totals.get(alloc.label) ?? 0) + 1);
          }
          if (key === todayStr) hasToday = true;
          cursor.setDate(cursor.getDate() + 1);
        }
      }
      if (hasToday) assigned++;
      else available++;
    }

    return {
      periodTotals: Array.from(totals.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 12),
      assignedCount: assigned,
      availableCount: available,
    };
  }, [entries, dates, todayStr]);

  return (
    <div className="px-3 py-2.5 bg-[oklch(0.96_0.005_250)] border-t flex items-center gap-4 flex-wrap text-xs">
      <span className="font-medium text-[oklch(0.16_0.035_250)]" style={{ fontFamily: "var(--font-display)" }}>
        Oppsummering
      </span>
      <span className="text-muted-foreground">{entries.length} personer</span>
      <span className="text-emerald-600">{assignedCount} tilordnet</span>
      <span className="text-amber-600">{availableCount} ledig</span>

      {periodTotals.length > 0 && (
        <div className="w-px h-4 bg-gray-200" />
      )}

      {periodTotals.map(([labelName, count]) => {
        const labelDef = getLabelStyle(labelName, colorMap);
        return (
          <div key={labelName} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: labelDef.color }}
            />
            <span className="text-muted-foreground">
              {labelName}: <span className="font-medium text-foreground">{count}</span> dv
            </span>
          </div>
        );
      })}
    </div>
  );
}
