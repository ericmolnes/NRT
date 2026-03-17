"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

interface StaffingToolbarProps {
  periodLabel: string;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onSearchChange: (search: string) => void;
  onExport: () => void;
}

export function StaffingToolbar({
  periodLabel,
  onNavigate,
  onSearchChange,
  onExport,
}: StaffingToolbarProps) {
  const [search, setSearch] = useState("");

  return (
    <div className="flex items-center gap-3 p-3 bg-white border-b border-gray-200/80 flex-wrap">
      {/* Navigation */}
      <div className="flex items-center gap-1 bg-[oklch(0.96_0.005_250)] rounded-lg p-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white" onClick={() => onNavigate("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs font-medium hover:bg-white" onClick={() => onNavigate("today")}>
          I dag
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white" onClick={() => onNavigate("next")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <span
        className="text-sm font-semibold text-[oklch(0.16_0.035_250)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {periodLabel}
      </span>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="S\u00f8k ansatt..."
          className="h-8 w-44 pl-8 text-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onSearchChange(e.target.value);
          }}
        />
      </div>

      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={onExport}>
        <Download className="h-3.5 w-3.5" />
        Eksporter
      </Button>
    </div>
  );
}
