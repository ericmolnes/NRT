"use client";

import { memo } from "react";
import type { LabelDef } from "./allocation-color-map";
import { cn } from "@/lib/utils";

export interface CellData {
  label: string;
  jobId?: string;
  jobName?: string;
  source?: string;
}

interface GridCellProps {
  entryId: string;
  date: string;
  cell?: CellData;
  labelDef?: LabelDef;
  isWeekend: boolean;
  isToday: boolean;
  isSelected: boolean;
  onMouseDown: (entryId: string, date: string) => void;
  onMouseEnter: (entryId: string, date: string) => void;
  onContextMenu: (e: React.MouseEvent, entryId: string, date: string) => void;
  onCellClick?: (e: React.MouseEvent, entryId: string, date: string) => void;
}

export const GridCell = memo(function GridCell({
  entryId,
  date,
  cell,
  labelDef,
  isWeekend,
  isToday,
  isSelected,
  onMouseDown,
  onMouseEnter,
  onContextMenu,
  onCellClick,
}: GridCellProps) {
  const titleParts = [cell?.label, cell?.jobName, date].filter(Boolean);

  return (
    <div
      className={cn(
        "h-8 min-w-[32px] border-r border-b border-gray-200/80 text-[9px] leading-8 text-center select-none cursor-pointer transition-none overflow-hidden relative",
        isWeekend && !labelDef && "bg-gray-50",
        isToday && "ring-1 ring-inset ring-[oklch(0.68_0.155_220)]",
        isSelected && "ring-2 ring-inset ring-[oklch(0.68_0.155_220)] z-10"
      )}
      style={
        labelDef
          ? { backgroundColor: labelDef.color, color: labelDef.textColor }
          : undefined
      }
      onMouseDown={() => onMouseDown(entryId, date)}
      onMouseEnter={() => onMouseEnter(entryId, date)}
      onContextMenu={(e) => onContextMenu(e, entryId, date)}
      onClick={(e) => {
        if (cell && onCellClick) {
          onCellClick(e, entryId, date);
        }
      }}
      title={titleParts.join(" \u2014 ")}
    >
      {labelDef ? labelDef.name.slice(0, 4) : ""}
      {cell?.source === "JOB_GENERATED" && labelDef && (
        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-tl-sm bg-white/40" />
      )}
    </div>
  );
});
