"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, MapPin, ExternalLink, UserX } from "lucide-react";
import Link from "next/link";

const CELL_W = 20;
const NAME_W = 220;

// ─── Customer Row ─────────────────────────────────────────────

interface CustomerRowProps {
  name: string;
  customerId: string;
  jobCount: number;
  assignedCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  dateCount: number;
}

export const CustomerRow = memo(function CustomerRow({
  name,
  customerId,
  jobCount,
  assignedCount,
  isExpanded,
  onToggle,
  dateCount,
}: CustomerRowProps) {
  return (
    <div className="flex cursor-pointer select-none" style={{ gridColumn: "1 / -1" }} onClick={onToggle}>
      <div
        className="sticky left-0 z-20 h-8 bg-[oklch(0.16_0.035_250)] text-white flex items-center gap-2 px-2 shrink-0"
        style={{ width: NAME_W, fontFamily: "var(--font-display)" }}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/60" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/60" />
        )}
        <span className="text-[11px] font-semibold truncate">{name}</span>
        <span className="text-[9px] text-white/50 shrink-0 ml-auto">
          {jobCount} jobb{jobCount !== 1 ? "er" : ""} \u00b7 {assignedCount} pers
        </span>
      </div>
      <div
        className="h-8 bg-[oklch(0.16_0.035_250)] border-b border-[oklch(0.22_0.03_250)]"
        style={{ width: dateCount * CELL_W }}
      />
    </div>
  );
});

// ─── Job Row ──────────────────────────────────────────────────

interface JobRowProps {
  name: string;
  jobId: string;
  location: string;
  status: string;
  assignedCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  dateCount: number;
}

export const JobRow = memo(function JobRow({
  name,
  jobId,
  location,
  status,
  assignedCount,
  isExpanded,
  onToggle,
  dateCount,
}: JobRowProps) {
  return (
    <div className="flex cursor-pointer select-none group" style={{ gridColumn: "1 / -1" }} onClick={onToggle}>
      <div
        className="sticky left-0 z-20 h-7 bg-[oklch(0.94_0.008_250)] flex items-center gap-1.5 pl-6 pr-2 border-b border-gray-200/80 shrink-0"
        style={{ width: NAME_W }}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="text-[11px] font-medium text-[oklch(0.25_0.04_250)] truncate">{name}</span>
        <span className="text-[9px] text-muted-foreground shrink-0 flex items-center gap-0.5">
          <MapPin className="h-2.5 w-2.5" />
          {location}
        </span>
        <Link
          href={`/jobber/${jobId}`}
          onClick={(e) => e.stopPropagation()}
          className="ml-auto opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
        >
          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
        </Link>
      </div>
      <div
        className="h-7 bg-[oklch(0.94_0.008_250)] border-b border-gray-200/80"
        style={{ width: dateCount * CELL_W }}
      />
    </div>
  );
});

// ─── Person Row ───────────────────────────────────────────────

interface Allocation {
  startDate: Date | string;
  endDate: Date | string;
  label: string;
  source: string;
}

interface PersonRowProps {
  personnelId: string;
  name: string;
  role: string;
  allocations: Allocation[];
  dates: string[];
  weekendSet: Set<string>;
  todayStr: string;
  jobColor: string;
}

export const PersonRow = memo(function PersonRow({
  personnelId,
  name,
  role,
  allocations,
  dates,
  weekendSet,
  todayStr,
  jobColor,
}: PersonRowProps) {
  const allocationSet = useMemo(() => {
    const set = new Set<string>();
    for (const alloc of allocations) {
      const start = new Date(alloc.startDate);
      const end = new Date(alloc.endDate);
      const cursor = new Date(start);
      while (cursor <= end) {
        set.add(cursor.toISOString().split("T")[0]);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return set;
  }, [allocations]);

  return (
    <div className="flex group" style={{ gridColumn: "1 / -1" }}>
      <Link
        href={`/personell/${personnelId}`}
        className="sticky left-0 z-20 h-6 bg-white flex items-center gap-1.5 pl-10 pr-2 border-b border-gray-100 shrink-0 hover:bg-[oklch(0.98_0.005_250)] transition-colors"
        style={{ width: NAME_W }}
      >
        <span className="text-[10px] text-foreground truncate">{name}</span>
        <span className="text-[8px] text-muted-foreground truncate hidden xl:inline">{role}</span>
        <ExternalLink className="h-2 w-2 text-muted-foreground/30 shrink-0 opacity-0 group-hover:opacity-100 ml-auto" />
      </Link>
      {dates.map((date) => {
        const isAllocated = allocationSet.has(date);
        const isWeekend = weekendSet.has(date);
        const isToday = date === todayStr;
        return (
          <div
            key={date}
            className={cn(
              "h-6 border-b border-r border-gray-100 shrink-0",
              isToday && "ring-1 ring-inset ring-[oklch(0.89_0.17_178)]"
            )}
            style={{
              width: CELL_W,
              backgroundColor: isAllocated ? jobColor : isWeekend ? "#f5f5f5" : "white",
            }}
            title={`${name} \u2014 ${date}${isAllocated ? " (tilordnet)" : ""}`}
          />
        );
      })}
    </div>
  );
});

// ─── Empty Job Row ────────────────────────────────────────────

interface EmptyJobRowProps {
  jobId: string;
  dateCount: number;
}

export const EmptyJobRow = memo(function EmptyJobRow({ jobId, dateCount }: EmptyJobRowProps) {
  return (
    <div className="flex" style={{ gridColumn: "1 / -1" }}>
      <div
        className="sticky left-0 z-20 h-6 bg-white flex items-center gap-1 pl-10 pr-2 border-b border-gray-100 shrink-0"
        style={{ width: NAME_W }}
      >
        <UserX className="h-3 w-3 text-red-400" />
        <span className="text-[10px] text-red-400 italic">Ingen ansatte...</span>
      </div>
      <div className="h-6 bg-white border-b border-gray-100" style={{ width: dateCount * CELL_W }} />
    </div>
  );
});

// ─── Available Person Row ─────────────────────────────────────

interface AvailablePersonRowProps {
  personnelId: string;
  name: string;
  role: string;
  dateCount: number;
}

export const AvailablePersonRow = memo(function AvailablePersonRow({
  personnelId,
  name,
  role,
  dateCount,
}: AvailablePersonRowProps) {
  return (
    <div className="flex group" style={{ gridColumn: "1 / -1" }}>
      <Link
        href={`/personell/${personnelId}`}
        className="sticky left-0 z-20 h-6 bg-white flex items-center gap-1.5 pl-6 pr-2 border-b border-gray-100 shrink-0 hover:bg-[oklch(0.98_0.005_250)] transition-colors"
        style={{ width: NAME_W }}
      >
        <span className="text-[10px] text-foreground truncate">{name}</span>
        <span className="text-[8px] text-muted-foreground truncate">{role}</span>
        <ExternalLink className="h-2 w-2 text-muted-foreground/30 shrink-0 opacity-0 group-hover:opacity-100 ml-auto" />
      </Link>
      <div className="h-6 bg-white border-b border-gray-100" style={{ width: dateCount * CELL_W }} />
    </div>
  );
});
