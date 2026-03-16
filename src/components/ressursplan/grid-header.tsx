"use client";

import { useMemo } from "react";
import { getWeekNumber } from "@/lib/resource-plan-utils";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];

const DAY_NAMES = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];

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
      {/* Månedsrad */}
      <div
        className="sticky top-0 z-30 flex"
        style={{ gridColumn: `1 / -1` }}
      >
        <div className="sticky left-0 z-30 h-6 bg-gray-800 text-white text-xs font-semibold flex items-center px-2 border-b border-gray-700 shrink-0" style={{ width: 410 }}>
          Ressursplan
        </div>
        {months.map((m, i) => (
          <div
            key={`month-${i}`}
            className="h-6 bg-gray-800 text-white text-[10px] font-semibold flex items-center justify-center border-b border-r border-gray-700 shrink-0"
            style={{ width: m.span * 28 }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Ukenummerrad */}
      <div
        className="sticky top-6 z-30 flex"
        style={{ gridColumn: `1 / -1` }}
      >
        <div className="sticky left-0 z-30 h-5 bg-gray-700 border-b border-gray-600 shrink-0" style={{ width: 410 }} />
        {weeks.map((w, i) => (
          <div
            key={`week-${i}`}
            className="h-5 bg-gray-700 text-gray-300 text-[10px] flex items-center justify-center border-b border-r border-gray-600 shrink-0"
            style={{ width: w.span * 28 }}
          >
            {w.label}
          </div>
        ))}
      </div>

      {/* Dagnavnrad */}
      <div className="sticky left-0 top-11 z-30 h-6 bg-gray-100 text-xs font-medium flex items-center px-2 border-b border-gray-300 min-w-[180px]">
        Navn
      </div>
      <div className="sticky left-[180px] top-11 z-30 h-6 bg-gray-100 text-[10px] font-medium flex items-center px-1 border-b border-r border-gray-300 min-w-[80px]">
        Crew
      </div>
      <div className="sticky left-[260px] top-11 z-30 h-6 bg-gray-100 text-[10px] font-medium flex items-center px-1 border-b border-r border-gray-300 min-w-[60px]">
        Selskap
      </div>
      <div className="sticky left-[320px] top-11 z-30 h-6 bg-gray-100 text-[10px] font-medium flex items-center px-1 border-b border-r border-gray-300 min-w-[90px]">
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
              "sticky top-11 z-20 h-6 min-w-[28px] text-[8px] flex flex-col items-center justify-center border-b border-r border-gray-300 leading-none",
              isWeekend ? "bg-gray-200 text-gray-500" : "bg-gray-100 text-gray-700",
              dateStr === todayStr && "bg-blue-100 font-bold text-blue-700"
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
