"use client";

import { useMemo } from "react";
import { getWeekNumber } from "@/lib/resource-plan-utils";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];

const DAY_NAMES = ["s\u00f8n", "man", "tir", "ons", "tor", "fre", "l\u00f8r"];

interface GridHeaderProps {
  dates: string[];
  todayStr: string;
}

interface Span {
  label: string;
  span: number;
}

export function GridHeader({ dates, todayStr }: GridHeaderProps) {
  const { months, weeks } = useMemo(() => {
    const monthSpans: Span[] = [];
    const weekSpans: Span[] = [];

    let currentMonth = -1;
    let currentWeek = -1;

    for (const dateStr of dates) {
      const d = new Date(dateStr + "T00:00:00");
      const month = d.getMonth();
      const week = getWeekNumber(d);

      if (month !== currentMonth) {
        monthSpans.push({ label: MONTH_NAMES[month], span: 1 });
        currentMonth = month;
      } else {
        monthSpans[monthSpans.length - 1].span++;
      }

      if (week !== currentWeek) {
        weekSpans.push({ label: `Uke ${week}`, span: 1 });
        currentWeek = week;
      } else {
        weekSpans[weekSpans.length - 1].span++;
      }
    }

    return { months: monthSpans, weeks: weekSpans };
  }, [dates]);

  return (
    <>
      {/* M\u00e5nedsrad */}
      <div
        className="sticky top-0 z-30 flex"
        style={{ gridColumn: `1 / -1` }}
      >
        <div
          className="sticky left-0 z-30 h-7 bg-[oklch(0.16_0.035_250)] text-white text-xs font-semibold flex items-center px-3 border-b border-[oklch(0.22_0.03_250)] shrink-0"
          style={{ width: 450, fontFamily: "var(--font-display)" }}
        >
          Ressursplan
        </div>
        {months.map((m, i) => (
          <div
            key={`month-${i}`}
            className="h-7 bg-[oklch(0.16_0.035_250)] text-white text-[11px] font-semibold flex items-center justify-center border-b border-r border-[oklch(0.22_0.03_250)] shrink-0"
            style={{ width: m.span * 32, fontFamily: "var(--font-display)" }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Ukenummerrad */}
      <div
        className="sticky top-7 z-30 flex"
        style={{ gridColumn: `1 / -1` }}
      >
        <div className="sticky left-0 z-30 h-5 bg-[oklch(0.20_0.03_250)] border-b border-[oklch(0.25_0.025_250)] shrink-0" style={{ width: 450 }} />
        {weeks.map((w, i) => (
          <div
            key={`week-${i}`}
            className="h-5 bg-[oklch(0.20_0.03_250)] text-[oklch(0.65_0.04_250)] text-[10px] flex items-center justify-center border-b border-r border-[oklch(0.25_0.025_250)] shrink-0"
            style={{ width: w.span * 32 }}
          >
            {w.label}
          </div>
        ))}
      </div>

      {/* Dagnavnrad */}
      <div className="sticky left-0 top-12 z-30 h-6 bg-[oklch(0.96_0.005_250)] text-xs font-medium flex items-center px-2.5 border-b border-gray-200 min-w-[200px]" style={{ fontFamily: "var(--font-display)" }}>
        Navn
      </div>
      <div className="sticky left-[200px] top-12 z-30 h-6 bg-[oklch(0.96_0.005_250)] text-[10px] font-medium flex items-center px-1.5 border-b border-r border-gray-200 min-w-[80px]">
        Crew
      </div>
      <div className="sticky left-[280px] top-12 z-30 h-6 bg-[oklch(0.96_0.005_250)] text-[10px] font-medium flex items-center px-1.5 border-b border-r border-gray-200 min-w-[70px]">
        Selskap
      </div>
      <div className="sticky left-[350px] top-12 z-30 h-6 bg-[oklch(0.96_0.005_250)] text-[10px] font-medium flex items-center px-1.5 border-b border-r border-gray-200 min-w-[100px]">
        Lokasjon
      </div>
      {dates.map((dateStr) => {
        const d = new Date(dateStr + "T00:00:00");
        const dayIndex = d.getDay();
        const isWeekend = dayIndex === 0 || dayIndex === 6;
        return (
          <div
            key={`day-${dateStr}`}
            className={cn(
              "sticky top-12 z-20 h-6 min-w-[32px] text-[8px] flex flex-col items-center justify-center border-b border-r border-gray-200 leading-none",
              isWeekend ? "bg-gray-100 text-gray-400" : "bg-[oklch(0.96_0.005_250)] text-gray-600",
              dateStr === todayStr && "bg-[oklch(0.92_0.03_220)] font-bold text-[oklch(0.35_0.1_220)]"
            )}
            title={dateStr}
          >
            <span>{DAY_NAMES[dayIndex]}</span>
            <span>{d.getDate()}</span>
          </div>
        );
      })}
    </>
  );
}
