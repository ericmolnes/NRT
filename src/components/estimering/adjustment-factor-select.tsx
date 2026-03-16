"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADJUSTMENT_FACTORS,
  getAdjustmentLabel,
  getAdjustmentColor,
} from "@/lib/estimering/adjustment-factors";

interface AdjustmentFactorSelectProps {
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export function AdjustmentFactorSelect({
  value,
  onValueChange,
  className = "",
  disabled = false,
}: AdjustmentFactorSelectProps) {
  const colorClass = getAdjustmentColor(value);

  return (
    <Select
      value={String(value)}
      onValueChange={(v: string | null) => {
        if (v) onValueChange(parseFloat(v));
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={`h-8 w-24 text-xs ${colorClass} ${className}`}
        title={getAdjustmentLabel(value)}
      >
        <SelectValue>
          {value}x
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ADJUSTMENT_FACTORS.map((f) => (
          <SelectItem key={f.value} value={String(f.value)}>
            <div className="flex flex-col">
              <span className={`font-medium ${f.color}`}>
                {f.value}x - {f.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {f.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
