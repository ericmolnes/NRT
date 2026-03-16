"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreSelectorProps {
  name: string;
  defaultValue?: number;
}

export function ScoreSelector({ name, defaultValue }: ScoreSelectorProps) {
  const [selected, setSelected] = useState<number | null>(
    defaultValue ?? null
  );

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={selected ?? ""} />
      <div className="flex gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => setSelected(num)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors",
              selected === num
                ? num >= 8
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : num >= 5
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-red-500 bg-red-500 text-white"
                : "border-border bg-background hover:bg-muted"
            )}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}
