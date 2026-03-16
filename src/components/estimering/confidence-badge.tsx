"use client";

import { cn } from "@/lib/utils";

export function ConfidenceBadge({
  confidence,
  verified,
}: {
  confidence: number | null;
  verified: boolean;
}) {
  if (verified) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        Verifisert
      </span>
    );
  }

  if (confidence === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        Manuell
      </span>
    );
  }

  const level =
    confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        level === "high" && "bg-green-100 text-green-800",
        level === "medium" && "bg-amber-100 text-amber-800",
        level === "low" && "bg-red-100 text-red-800"
      )}
    >
      {Math.round(confidence * 100)}%
    </span>
  );
}
