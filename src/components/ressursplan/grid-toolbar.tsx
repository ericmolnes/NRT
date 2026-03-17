"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LabelDef } from "./allocation-color-map";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Eraser, Download, Settings, X, Briefcase } from "lucide-react";
import { AddEntryModal } from "./add-entry-modal";

interface ActiveJob {
  id: string;
  name: string;
  location: string;
  project: { id: string; name: string } | null;
}

interface GridToolbarProps {
  crews: string[];
  companies: string[];
  locations: string[];
  labels: LabelDef[];
  activeJobs: ActiveJob[];
  activeTool: string | null;
  onToolChange: (labelName: string | null) => void;
  onFilterChange: (filters: { search?: string; crew?: string; company?: string; location?: string; jobId?: string }) => void;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onExport: () => void;
  onManageLabels: () => void;
  onAddEntry: () => void;
  planId: string;
  currentPeriodLabel: string;
  activeFilters: { search?: string; crew?: string; company?: string; location?: string; jobId?: string };
}

export function GridToolbar({
  crews,
  companies,
  locations,
  labels,
  activeJobs,
  activeTool,
  onToolChange,
  onFilterChange,
  onNavigate,
  onExport,
  onManageLabels,
  onAddEntry,
  planId,
  currentPeriodLabel,
  activeFilters,
}: GridToolbarProps) {
  const [search, setSearch] = useState(activeFilters.search ?? "");

  const grouped = {
    client: labels.filter((l) => l.category === "client"),
    status: labels.filter((l) => l.category === "status"),
    internal: labels.filter((l) => l.category === "internal"),
  };

  const hasActiveFilters = Boolean(activeFilters.crew || activeFilters.company || activeFilters.location || activeFilters.jobId);

  return (
    <div className="flex flex-col gap-2.5 p-3 bg-white border-b border-gray-200/80">
      {/* Row 1: Navigation + Filters */}
      <div className="flex items-center gap-2 flex-wrap">
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
        <span className="text-sm font-medium text-[oklch(0.16_0.035_250)] ml-1" style={{ fontFamily: "var(--font-display)" }}>
          {currentPeriodLabel}
        </span>

        <div className="flex-1" />

        {/* Search */}
        <Input
          placeholder="S\u00f8k navn..."
          className="h-8 w-40 text-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onFilterChange({ search: e.target.value || undefined });
          }}
        />

        {/* Filters */}
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          value={activeFilters.crew ?? ""}
          onChange={(e) => onFilterChange({ crew: e.target.value || undefined })}
        >
          <option value="">Crew</option>
          {crews.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          value={activeFilters.company ?? ""}
          onChange={(e) => onFilterChange({ company: e.target.value || undefined })}
        >
          <option value="">Selskap</option>
          {companies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          value={activeFilters.location ?? ""}
          onChange={(e) => onFilterChange({ location: e.target.value || undefined })}
        >
          <option value="">Lokasjon</option>
          {locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        {/* Job filter */}
        {activeJobs.length > 0 && (
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            value={activeFilters.jobId ?? ""}
            onChange={(e) => onFilterChange({ jobId: e.target.value || undefined })}
          >
            <option value="">Jobb</option>
            {activeJobs.map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
        )}

        <AddEntryModal planId={planId} onAdded={onAddEntry} />

        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          Eksporter
        </Button>
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Aktive filtre:</span>
          {activeFilters.crew && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 pr-1">
              Crew: {activeFilters.crew}
              <button onClick={() => onFilterChange({ crew: undefined })} className="hover:text-red-500">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {activeFilters.company && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 pr-1">
              Selskap: {activeFilters.company}
              <button onClick={() => onFilterChange({ company: undefined })} className="hover:text-red-500">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {activeFilters.location && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 pr-1">
              Lokasjon: {activeFilters.location}
              <button onClick={() => onFilterChange({ location: undefined })} className="hover:text-red-500">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {activeFilters.jobId && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 pr-1 bg-[oklch(0.92_0.03_220)] text-[oklch(0.35_0.1_220)]">
              <Briefcase className="h-2.5 w-2.5" />
              {activeJobs.find((j) => j.id === activeFilters.jobId)?.name ?? "Jobb"}
              <button onClick={() => onFilterChange({ jobId: undefined })} className="hover:text-red-500">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground underline"
            onClick={() => onFilterChange({ crew: undefined, company: undefined, location: undefined, jobId: undefined })}
          >
            Fjern alle
          </button>
        </div>
      )}

      {/* Row 2: Label palette */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] text-muted-foreground mr-1 font-medium uppercase tracking-wider">Tilordne:</span>

        {grouped.client.map((label) => (
          <PaletteButton
            key={label.id}
            label={label}
            isActive={activeTool === label.name}
            onClick={() => onToolChange(activeTool === label.name ? null : label.name)}
          />
        ))}

        {grouped.client.length > 0 && (grouped.internal.length > 0 || grouped.status.length > 0) && (
          <div className="w-px h-5 bg-gray-200 mx-0.5" />
        )}

        {grouped.internal.map((label) => (
          <PaletteButton
            key={label.id}
            label={label}
            isActive={activeTool === label.name}
            onClick={() => onToolChange(activeTool === label.name ? null : label.name)}
          />
        ))}

        {grouped.internal.length > 0 && grouped.status.length > 0 && (
          <div className="w-px h-5 bg-gray-200 mx-0.5" />
        )}

        {grouped.status.map((label) => (
          <PaletteButton
            key={label.id}
            label={label}
            isActive={activeTool === label.name}
            onClick={() => onToolChange(activeTool === label.name ? null : label.name)}
          />
        ))}

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        <button
          className={cn(
            "h-7 px-2.5 rounded-md text-[11px] font-medium border-2 bg-white text-gray-500 flex items-center gap-1 transition-all",
            activeTool === "__eraser__" ? "border-[oklch(0.16_0.035_250)] scale-105 shadow-md text-gray-900" : "border-transparent hover:border-gray-300"
          )}
          onClick={() => onToolChange(activeTool === "__eraser__" ? null : "__eraser__")}
          title="Viskel\u00e6r"
        >
          <Eraser className="h-3.5 w-3.5" />
          Fjern
        </button>

        <button
          className="h-7 px-2 rounded-md text-[11px] font-medium border-2 border-transparent bg-[oklch(0.96_0.005_250)] text-gray-500 hover:bg-gray-200 flex items-center gap-1 ml-0.5 transition-colors"
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
        "h-7 px-2.5 rounded-md text-[11px] font-medium transition-all border-2",
        isActive ? "border-[oklch(0.16_0.035_250)] scale-105 shadow-md" : "border-transparent opacity-85 hover:opacity-100"
      )}
      style={{ backgroundColor: label.color, color: label.textColor }}
      onClick={onClick}
    >
      {label.name}
    </button>
  );
}
