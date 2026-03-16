"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "oversikt", label: "Oversikt" },
  { id: "kalkyle", label: "Kalkyle" },
  { id: "kabler", label: "Kabler" },
  { id: "utstyr", label: "Utstyr" },
  { id: "omfang", label: "Omfang" },
  { id: "materialer", label: "Materialer" },
  { id: "sammendrag", label: "Sammendrag" },
  { id: "faktisk-tid", label: "Faktisk tid" },
];

export function EstimateTabs({ estimateStatus }: { estimateStatus?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "oversikt";

  // Vis "Faktisk tid"-fane kun for godkjente/fullforte estimater
  const visibleTabs =
    estimateStatus === "APPROVED" || estimateStatus === "COMPLETED"
      ? tabs
      : tabs.filter((t) => t.id !== "faktisk-tid");

  return (
    <div className="flex border-b gap-1">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", tab.id);
            router.push(`?${params.toString()}`);
          }}
          className={cn(
            "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors -mb-px",
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
