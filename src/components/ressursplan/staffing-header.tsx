"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];
const DAY_ABBR = ["s\u00f8", "ma", "ti", "on", "to", "fr", "l\u00f8"];

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

interface StaffingHeaderProps {
  dates: string[];
  todayStr: string;
}

interface Span { label: string; span: number }

const CELL_W = 20;
const NAME_W = 220;

export function StaffingHeader({ dates, todayStr }: StaffingHeaderProps) {
  const { months, weeks } = useMemo(() => {
    const monthSpans: Span[] = [];
    const weekSpans: Span[] = [];
    let curMonth = -1;
    let curWeek = -1;

    for (const dateStr of dates) {
      const d = new Date(dateStr + "T00:00:00");
      const month = d.getMonth();
      const week = getWeekNumber(d);

      if (month !== curMonth) {
        monthSpans.push({ label: MONTH_NAMES[month], span: 1 });
        curMonth = month;
      } else {
        monthSpans[monthSpans.length - 1].span++;
      }

      if (week !== curWeek) {
        weekSpans.push({ label: String(week), span: 1 });
        curWeek = week;
      } else {
        weekSpans[weekSpans.length - 1].span++;
      }
    }
    return { months: monthSpans, weeks: weekSpans };
  }, [dates]);

  return (
    <>
      {/* Month row */}
      <div className="sticky top-0 z-30 flex" style={{ gridColumn: "1 / -1" }}>
        <div
          className="sticky left-0 z-30 h-7 bg-[oklch(0.16_0.035_250)] text-white text-[11px] font-semibold flex items-center px-3 border-b border-[oklch(0.22_0.03_250)] shrink-0"
          style={{ width: NAME_W, fontFamily: "var(--font-display)" }}
        >
          Bemanningsplan
        </div>
        {months.map((m, i) => (
          <div
            key={`m-${i}`}
            className="h-7 bg-[oklch(0.16_0.035_250)] text-white text-[10px] font-semibold flex items-center justify-center border-b border-r border-[oklch(0.22_0.03_250)] shrink-0"
            style={{ width: m.span * CELL_W, fontFamily: "var(--font-display)" }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Week row */}
      <div className="sticky top-7 z-30 flex" style={{ gridColumn: "1 / -1" }}>
        <div
          className="sticky left-0 z-30 h-5 bg-[oklch(0.20_0.03_250)] border-b border-[oklch(0.25_0.025_250)] shrink-0"
          style={{ width: NAME_W }}
        />
        {weeks.map((w, i) => (
          <div
            key={`w-${i}`}
            className="h-5 bg-[oklch(0.20_0.03_250)] text-[oklch(0.60_0.04_250)] text-[9px] flex items-center justify-center border-b border-r border-[oklch(0.25_0.025_250)] shrink-0"
            style={{ width: w.span * CELL_W }}
          >
            Uke {w.label}
          </div>
        ))}
      </div>

      {/* Day row */}
      <div
        className="sticky left-0 top-12 z-30 h-5 bg-[oklch(0.96_0.005_250)] text-[9px] font-medium flex items-center px-2 border-b border-gray-200 shrink-0"
        style={{ width: NAME_W }}
      />
      {dates.map((dateStr) => {
        const d = new Date(dateStr + "T00:00:00");
        const dayIdx = d.getDay();
        const isWeekend = dayIdx === 0 || dayIdx === 6;
        const isToday = dateStr === todayStr;
        return (
          <div
            key={`d-${dateStr}`}
            className={cn(
              "sticky top-12 z-20 h-5 flex flex-col items-center justify-center border-b border-r border-gray-200 shrink-0 text-[7px] leading-none",
              isWeekend ? "bg-gray-100 text-gray-300" : "bg-[oklch(0.96_0.005_250)] text-gray-500",
              isToday && "bg-[oklch(0.88_0.04_220)] text-[oklch(0.30_0.12_220)] font-bold"
            )}
            style={{ width: CELL_W }}
            title={`${DAY_ABBR[dayIdx]} ${d.getDate()}.${d.getMonth() + 1}`}
          >
            <span>{d.getDate()}</span>
          </div>
        );
      })}
    </>
  );
}
