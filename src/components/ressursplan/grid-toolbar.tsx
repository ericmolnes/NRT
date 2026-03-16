"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LabelDef } from "./allocation-color-map";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Eraser, Download, Settings } from "lucide-react";
import { AddEntryModal } from "./add-entry-modal";

interface GridToolbarProps {
  crews: string[];
  companies: string[];
  locations: string[];
  labels: LabelDef[];
  activeTool: string | null; // label name or null (eraser)
  onToolChange: (labelName: string | null) => void;
  onFilterChange: (filters: { search?: string; crew?: string; company?: string; location?: string }) => void;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onExport: () => void;
  onManageLabels: () => void;
  onAddEntry: () => void;
  planId: string;
  currentPeriodLabel: string;
}

export function GridToolbar({
  crews,
  companies,
  locations,
  labels,
  activeTool,
  onToolChange,
  onFilterChange,
  onNavigate,
  onExport,
  onManageLabels,
  onAddEntry,
  planId,
  currentPeriodLabel,
}: GridToolbarProps) {
  const [search, setSearch] = useState("");

  // Grupper labels etter kategori
  const grouped = {
    client: labels.filter((l) => l.category === "client"),
    status: labels.filter((l) => l.category === "status"),
    internal: labels.filter((l) => l.category === "internal"),
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-white border-b">
      {/* Rad 1: Navigasjon og filtre */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onNavigate("today")}>
            I dag
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">{currentPeriodLabel}</span>
        </div>

        <div className="flex-1" />

        <Input
          placeholder="Sok etter navn..."
          className="h-8 w-48"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onFilterChange({ search: e.target.value || undefined });
          }}
        />

        <Select onValueChange={(v: string | null) => onFilterChange({ crew: !v || v === "all" ? undefined : v })}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue placeholder="Crew" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle crews</SelectItem>
            {crews.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(v: string | null) => onFilterChange({ company: !v || v === "all" ? undefined : v })}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue placeholder="Selskap" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle selskap</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(v: string | null) => onFilterChange({ location: !v || v === "all" ? undefined : v })}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue placeholder="Lokasjon" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle lokasjoner</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <AddEntryModal planId={planId} onAdded={onAddEntry} />

        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          Eksporter
        </Button>
      </div>

      {/* Rad 2: Dynamisk tilordningspalett */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Tilordne:</span>

        {/* Klienter */}
        {grouped.client.map((label) => (
          <PaletteButton
            key={label.id}
            label={label}
            isActive={activeTool === label.name}
            onClick={() => onToolChange(activeTool === label.name ? null : label.name)}
          />
        ))}

        {grouped.client.length > 0 && (grouped.internal.length > 0 || grouped.status.length > 0) && (
          <div className="w-px h-5 bg-gray-300 mx-1" />
        )}

        {/* Intern */}
        {grouped.internal.map((label) => (
          <PaletteButton
            key={label.id}
            label={label}
            isActive={activeTool === label.name}
            onClick={() => onToolChange(activeTool === label.name ? null : label.name)}
          />
        ))}

        {grouped.internal.length > 0 && grouped.status.length > 0 && (
          <div className="w-px h-5 bg-gray-300 mx-1" />
        )}

        {/* Status */}
        {grouped.status.map((label) => (
          <PaletteButton
            key={label.id}
            label={label}
            isActive={activeTool === label.name}
            onClick={() => onToolChange(activeTool === label.name ? null : label.name)}
          />
        ))}

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Viskelær */}
        <button
          className={cn(
            "h-7 px-2.5 rounded text-[11px] font-medium border-2 bg-white text-gray-600 flex items-center gap-1",
            activeTool === "__eraser__" ? "border-gray-900 scale-105 shadow-md" : "border-transparent opacity-80 hover:opacity-100"
          )}
          onClick={() => onToolChange(activeTool === "__eraser__" ? null : "__eraser__")}
          title="Viskelær - fjern tilordninger"
        >
          <Eraser className="h-3.5 w-3.5" />
          Fjern
        </button>

        {/* Administrer labels */}
        <button
          className="h-7 px-2 rounded text-[11px] font-medium border-2 border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center gap-1 ml-1"
          onClick={onManageLabels}
          title="Administrer tilordningstyper"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function PaletteButton({ label, isActive, onClick }: { label: LabelDef; isActive: boolean; onClick: () => void }) {
  return (
    <button
      className={cn(
        "h-7 px-2.5 rounded text-[11px] font-medium transition-all border-2",
        isActive ? "border-gray-900 scale-105 shadow-md" : "border-transparent opacity-80 hover:opacity-100"
      )}
      style={{ backgroundColor: label.color, color: label.textColor }}
      onClick={onClick}
    >
      {label.name}
    </button>
  );
}
