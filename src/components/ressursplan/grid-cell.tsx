"use client";

import { memo } from "react";
import type { LabelDef } from "./allocation-color-map";
import { cn } from "@/lib/utils";

interface GridCellProps {
  entryId: string;
  date: string;
  label?: string;
  labelDef?: LabelDef;
  isWeekend: boolean;
  isToday: boolean;
  isSelected: boolean;
  onMouseDown: (entryId: string, date: string) => void;
  onMouseEnter: (entryId: string, date: string) => void;
  onContextMenu: (e: React.MouseEvent, entryId: string, date: string) => void;
}

export const GridCell = memo(function GridCell({
  entryId,
  date,
  label,
  labelDef,
  isWeekend,
  isToday,
  isSelected,
  onMouseDown,
  onMouseEnter,
  onContextMenu,
}: GridCellProps) {
  return (
    <div
      className={cn(
        "h-7 min-w-[28px] border-r border-b border-gray-200 text-[9px] leading-7 text-center select-none cursor-pointer transition-none overflow-hidden",
        isWeekend && !labelDef && "bg-gray-100",
        isToday && "ring-1 ring-inset ring-blue-500",
        isSelected && "ring-2 ring-inset ring-blue-600 z-10"
      )}
      style={
        labelDef
          ? { backgroundColor: labelDef.color, color: labelDef.textColor }
          : undefined
      }
      onMouseDown={() => onMouseDown(entryId, date)}
      onMouseEnter={() => onMouseEnter(entryId, date)}
      onContextMenu={(e) => onContextMenu(e, entryId, date)}
      title={label ? `${label} - ${date}` : date}
    >
      {labelDef ? labelDef.name.slice(0, 4) : ""}
    </div>
  );
});
