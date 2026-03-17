"use client";

interface StaffingSummaryProps {
  totalJobs: number;
  totalAssigned: number;
  totalAvailable: number;
  totalCustomers: number;
}

export function StaffingSummary({
  totalJobs,
  totalAssigned,
  totalAvailable,
  totalCustomers,
}: StaffingSummaryProps) {
  return (
    <div className="px-3 py-2 bg-[oklch(0.96_0.005_250)] border-t flex items-center gap-5 text-xs">
      <span className="font-medium text-[oklch(0.16_0.035_250)]" style={{ fontFamily: "var(--font-display)" }}>
        Oppsummering
      </span>
      <span className="text-muted-foreground">
        {totalCustomers} kunder
      </span>
      <span className="text-muted-foreground">
        {totalJobs} aktive jobber
      </span>
      <span className="text-emerald-600 font-medium">
        {totalAssigned} tilordnet
      </span>
      <span className="text-amber-600 font-medium">
        {totalAvailable} ledig
      </span>
    </div>
  );
}
