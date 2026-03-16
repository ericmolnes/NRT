"use client";

import type { SegmentType } from "@/generated/prisma/client";

interface Segment {
  type: SegmentType;
  days: number;
  label?: string | null;
}

const SEGMENT_COLORS: Record<SegmentType, { bg: string; text: string; label: string }> = {
  WORK: { bg: "#22c55e", text: "#fff", label: "Arbeid" },
  OFF: { bg: "#e5e7eb", text: "#6b7280", label: "Fri" },
  VACATION: { bg: "#facc15", text: "#422006", label: "Ferie" },
  AVSPASERING: { bg: "#a78bfa", text: "#fff", label: "Avspasering" },
  COURSE: { bg: "#60a5fa", text: "#fff", label: "Kurs" },
};

interface RotationPreviewProps {
  segments: Segment[];
  totalDays: number;
}

export function RotationPreview({ segments, totalDays }: RotationPreviewProps) {
  if (segments.length === 0) {
    return <div className="text-xs text-muted-foreground">Ingen segmenter definert</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex rounded overflow-hidden h-8">
        {segments.map((seg, i) => {
          const color = SEGMENT_COLORS[seg.type];
          const widthPercent = (seg.days / totalDays) * 100;
          return (
            <div
              key={i}
              className="flex items-center justify-center text-[10px] font-medium min-w-[24px]"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: color.bg,
                color: color.text,
              }}
              title={`${seg.label || color.label}: ${seg.days} dager`}
            >
              {seg.days}d
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span>Syklus: {totalDays} dager</span>
        {segments.map((seg, i) => {
          const color = SEGMENT_COLORS[seg.type];
          return (
            <span key={i} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: color.bg }} />
              {seg.label || color.label} ({seg.days}d)
            </span>
          );
        })}
      </div>
    </div>
  );
}
