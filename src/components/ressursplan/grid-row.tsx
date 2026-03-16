"use client";

import { memo, useMemo } from "react";
import { GridCell } from "./grid-cell";
import type { LabelDef } from "./allocation-color-map";
import { getLabelStyle } from "./allocation-color-map";

interface Allocation {
  startDate: string | Date;
  endDate: string | Date;
  label: string;
}

interface GridRowProps {
  entryId: string;
  displayName: string;
  crew: string | null;
  company: string | null;
  location: string | null;
  allocations: Allocation[];
  dates: string[];
  weekendSet: Set<string>;
  todayStr: string;
  selectedDates: Set<string>;
  isEntrySelected: boolean;
  colorMap: Map<string, LabelDef>;
  onCellMouseDown: (entryId: string, date: string) => void;
  onCellMouseEnter: (entryId: string, date: string) => void;
  onCellContextMenu: (e: React.MouseEvent, entryId: string, date: string) => void;
  onEntryClick: (entryId: string) => void;
}

export const GridRow = memo(function GridRow({
  entryId,
  displayName,
  crew,
  company,
  location,
  allocations,
  dates,
  weekendSet,
  todayStr,
  selectedDates,
  isEntrySelected,
  colorMap,
  onCellMouseDown,
  onCellMouseEnter,
  onCellContextMenu,
  onEntryClick,
}: GridRowProps) {
  const allocationMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const alloc of allocations) {
      const start = new Date(alloc.startDate);
      const end = new Date(alloc.endDate);
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = cursor.toISOString().split("T")[0];
        map.set(key, alloc.label);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [allocations]);

  return (
    <div className="contents group">
      <div
        className="sticky left-0 z-20 flex items-center gap-1 h-7 px-2 border-r border-b border-gray-300 bg-white group-hover:bg-gray-50 cursor-pointer text-xs font-medium truncate min-w-[180px]"
        onClick={() => onEntryClick(entryId)}
        title={displayName}
      >
        {displayName}
      </div>
      <div className="sticky left-[180px] z-20 flex items-center h-7 px-1 border-r border-b border-gray-300 bg-white group-hover:bg-gray-50 text-[10px] text-muted-foreground truncate min-w-[80px]">
        {crew}
      </div>
      <div className="sticky left-[260px] z-20 flex items-center h-7 px-1 border-r border-b border-gray-300 bg-white group-hover:bg-gray-50 text-[10px] text-muted-foreground truncate min-w-[60px]">
        {company}
      </div>
      <div className="sticky left-[320px] z-20 flex items-center h-7 px-1 border-r border-b border-gray-300 bg-white group-hover:bg-gray-50 text-[10px] text-muted-foreground truncate min-w-[90px]">
        {location}
      </div>

      {dates.map((date) => {
        const label = allocationMap.get(date);
        const labelDef = label ? getLabelStyle(label, colorMap) : undefined;
        return (
          <GridCell
            key={date}
            entryId={entryId}
            date={date}
            label={label}
            labelDef={labelDef}
            isWeekend={weekendSet.has(date)}
            isToday={date === todayStr}
            isSelected={isEntrySelected && selectedDates.has(date)}
            onMouseDown={onCellMouseDown}
            onMouseEnter={onCellMouseEnter}
            onContextMenu={onCellContextMenu}
          />
        );
      })}
    </div>
  );
});
