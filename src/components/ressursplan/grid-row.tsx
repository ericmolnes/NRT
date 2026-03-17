"use client";

import { memo, useMemo } from "react";
import { GridCell, type CellData } from "./grid-cell";
import type { LabelDef } from "./allocation-color-map";
import { getLabelStyle } from "./allocation-color-map";
import { ExternalLink } from "lucide-react";

interface Allocation {
  startDate: string | Date;
  endDate: string | Date;
  label: string;
  source?: string;
  jobAssignment?: {
    id: string;
    job: {
      id: string;
      name: string;
      location: string;
      status: string;
      project: { id: string; name: string } | null;
    };
  } | null;
}

interface GridRowProps {
  entryId: string;
  displayName: string;
  crew: string | null;
  company: string | null;
  location: string | null;
  personnelId: string | null;
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
  onCellClick?: (e: React.MouseEvent, entryId: string, date: string) => void;
}

export const GridRow = memo(function GridRow({
  entryId,
  displayName,
  crew,
  company,
  location,
  personnelId,
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
  onCellClick,
}: GridRowProps) {
  const allocationMap = useMemo(() => {
    const map = new Map<string, CellData>();
    for (const alloc of allocations) {
      const start = new Date(alloc.startDate);
      const end = new Date(alloc.endDate);
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = cursor.toISOString().split("T")[0];
        map.set(key, {
          label: alloc.label,
          jobId: alloc.jobAssignment?.job?.id,
          jobName: alloc.jobAssignment?.job?.name,
          source: alloc.source,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [allocations]);

  return (
    <div className="contents group">
      <div
        className="sticky left-0 z-20 flex items-center gap-1.5 h-8 px-2.5 border-r border-b border-gray-200/80 bg-white group-hover:bg-[oklch(0.98_0.005_250)] cursor-pointer text-xs font-medium truncate min-w-[200px] transition-colors"
        onClick={() => onEntryClick(entryId)}
        title={displayName}
      >
        <span className="truncate">{displayName}</span>
        {personnelId && (
          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div className="sticky left-[200px] z-20 flex items-center h-8 px-1.5 border-r border-b border-gray-200/80 bg-white group-hover:bg-[oklch(0.98_0.005_250)] text-[10px] text-muted-foreground truncate min-w-[80px] transition-colors">
        {crew}
      </div>
      <div className="sticky left-[280px] z-20 flex items-center h-8 px-1.5 border-r border-b border-gray-200/80 bg-white group-hover:bg-[oklch(0.98_0.005_250)] text-[10px] text-muted-foreground truncate min-w-[70px] transition-colors">
        {company}
      </div>
      <div className="sticky left-[350px] z-20 flex items-center h-8 px-1.5 border-r border-b border-gray-200/80 bg-white group-hover:bg-[oklch(0.98_0.005_250)] text-[10px] text-muted-foreground truncate min-w-[100px] transition-colors">
        {location}
      </div>

      {dates.map((date) => {
        const cell = allocationMap.get(date);
        const labelDef = cell ? getLabelStyle(cell.label, colorMap) : undefined;
        return (
          <GridCell
            key={date}
            entryId={entryId}
            date={date}
            cell={cell}
            labelDef={labelDef}
            isWeekend={weekendSet.has(date)}
            isToday={date === todayStr}
            isSelected={isEntrySelected && selectedDates.has(date)}
            onMouseDown={onCellMouseDown}
            onMouseEnter={onCellMouseEnter}
            onContextMenu={onCellContextMenu}
            onCellClick={onCellClick}
          />
        );
      })}
    </div>
  );
});
