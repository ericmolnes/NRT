"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreSelectorProps {
  name: string;
  defaultValue?: number;
  onScoreChange?: (value: number) => void;
}

export function ScoreSelector({ name, defaultValue, onScoreChange }: ScoreSelectorProps) {
  const [selected, setSelected] = useState<number | null>(
    defaultValue ?? null
  );

  function handleSelect(num: number) {
    setSelected(num);
    onScoreChange?.(num);
  }

  return (
    <div>
      <input type="hidden" name={name} value={selected ?? ""} />
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleSelect(num)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150",
              selected === num
                ? num >= 8
                  ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 scale-105"
                  : num >= 5
                    ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30 scale-105"
                    : "bg-red-500 text-white shadow-sm shadow-red-500/30 scale-105"
                : selected !== null && selected !== num
                  ? "bg-[oklch(0.94_0.01_250)] text-[oklch(0.50_0.02_250)] hover:bg-[oklch(0.90_0.015_250)]"
                  : "bg-white border border-[oklch(0.88_0.015_250)] text-[oklch(0.35_0.03_250)] hover:border-[oklch(0.89_0.17_178)] hover:bg-[oklch(0.89_0.17_178_/_5%)]"
            )}
          >
            {num}
          </button>
        ))}
      </div>
      {selected !== null && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <div
            className={cn(
              "h-1 flex-1 rounded-full overflow-hidden bg-[oklch(0.94_0.01_250)]"
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                selected >= 8
                  ? "bg-emerald-500"
                  : selected >= 5
                    ? "bg-amber-500"
                    : "bg-red-500"
              )}
              style={{ width: `${selected * 10}%` }}
            />
          </div>
          <span className={cn(
            "text-[10px] font-bold tabular-nums",
            selected >= 8
              ? "text-emerald-600"
              : selected >= 5
                ? "text-amber-600"
                : "text-red-600"
          )}>
            {selected}/10
          </span>
        </div>
      )}
    </div>
  );
}
