"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { GridHeader } from "./grid-header";
import { GridRow } from "./grid-row";
import { GridToolbar } from "./grid-toolbar";
import { GridSummary } from "./grid-summary";
import { ContextMenu } from "./context-menu";
import { AllocationPopover } from "./allocation-popover";
import { LabelManager } from "./label-manager";
import { EntryEditor } from "./entry-editor";
import { useGridSelection } from "./use-grid-selection";
import { buildColorMap, type LabelDef } from "./allocation-color-map";
import { formatDate, getDateRange } from "@/lib/resource-plan-utils";
import { bulkSetAllocations, clearAllocations } from "@/app/(authenticated)/ressursplan/actions";
import { AddEntryModal } from "./add-entry-modal";

interface AllocationJob {
  id: string;
  job: {
    id: string;
    name: string;
    location: string;
    status: string;
    project: { id: string; name: string } | null;
  };
}

interface Allocation {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  label: string;
  source?: string;
  jobAssignment?: AllocationJob | null;
}

interface Entry {
  id: string;
  displayName: string;
  crew: string | null;
  company: string | null;
  location: string | null;
  notes: string | null;
  allocations: Allocation[];
  personnel: { id: string; name: string; status: string } | null;
}

interface ActiveJob {
  id: string;
  name: string;
  location: string;
  project: { id: string; name: string } | null;
}

interface ResourcePlanGridProps {
  planId: string;
  initialEntries: Entry[];
  initialLabels: LabelDef[];
  year: number;
  crews: string[];
  companies: string[];
  locations: string[];
  activeJobs: ActiveJob[];
}

const WEEKS_TO_SHOW = 8;
const DAYS_TO_SHOW = WEEKS_TO_SHOW * 7;

export function ResourcePlanGrid({
  planId,
  initialEntries,
  initialLabels,
  year,
  crews,
  companies,
  locations,
  activeJobs,
}: ResourcePlanGridProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [labels, setLabels] = useState(initialLabels);
  const [filters, setFilters] = useState<{
    search?: string;
    crew?: string;
    company?: string;
    location?: string;
    jobId?: string;
  }>({});

  const [windowStart, setWindowStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday;
  });

  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entryId: string;
    date: string;
    currentLabel?: string;
    jobId?: string;
    jobName?: string;
    projectId?: string;
    projectName?: string;
  } | null>(null);

  const [popover, setPopover] = useState<{
    x: number;
    y: number;
    entryId: string;
    date: string;
    label: string;
    labelColor?: string;
    labelTextColor?: string;
    jobId?: string;
    jobName?: string;
    projectId?: string;
    projectName?: string;
    jobLocation?: string;
    source?: string;
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const {
    selection,
    isSelecting,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    clearSelection,
  } = useGridSelection();

  const colorMap = useMemo(() => buildColorMap(labels), [labels]);

  const dates = useMemo(() => {
    const end = new Date(windowStart);
    end.setDate(end.getDate() + DAYS_TO_SHOW - 1);
    return getDateRange(windowStart, end).map((d) => formatDate(d));
  }, [windowStart]);

  const weekendSet = useMemo(() => {
    const set = new Set<string>();
    for (const dateStr of dates) {
      const d = new Date(dateStr + "T00:00:00");
      const day = d.getDay();
      if (day === 0 || day === 6) set.add(dateStr);
    }
    return set;
  }, [dates]);

  const todayStr = formatDate(new Date());

  const fetchGridData = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = formatDate(windowStart);
      const endD = new Date(windowStart);
      endD.setDate(endD.getDate() + DAYS_TO_SHOW - 1);
      const endDate = formatDate(endD);

      const params = new URLSearchParams({
        planId,
        startDate,
        endDate,
        ...(filters.search && { search: filters.search }),
        ...(filters.crew && { crew: filters.crew }),
        ...(filters.company && { company: filters.company }),
        ...(filters.location && { location: filters.location }),
        ...(filters.jobId && { jobId: filters.jobId }),
      });

      const res = await fetch(`/api/resource-plan/grid?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
      }
    } finally {
      setIsLoading(false);
    }
  }, [planId, windowStart, filters]);

  useEffect(() => {
    fetchGridData();
  }, [fetchGridData]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((e) => e.displayName.toLowerCase().includes(q));
    }
    if (filters.crew) result = result.filter((e) => e.crew === filters.crew);
    if (filters.company) result = result.filter((e) => e.company === filters.company);
    if (filters.location) result = result.filter((e) => e.location === filters.location);
    return result;
  }, [entries, filters]);

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, Entry[]>();
    for (const entry of filteredEntries) {
      const key = entry.crew ?? "Uspesifisert";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    }
    return groups;
  }, [filteredEntries]);

  const handleNavigate = useCallback((direction: "prev" | "next" | "today") => {
    setWindowStart((prev) => {
      if (direction === "today") {
        const today = new Date();
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);
        return monday;
      }
      const d = new Date(prev);
      d.setDate(d.getDate() + (direction === "next" ? 7 * 4 : -7 * 4));
      return d;
    });
  }, []);

  const currentPeriodLabel = useMemo(() => {
    const endD = new Date(windowStart);
    endD.setDate(endD.getDate() + DAYS_TO_SHOW - 1);
    const startMonth = windowStart.toLocaleDateString("nb-NO", { month: "short", day: "numeric" });
    const endMonth = endD.toLocaleDateString("nb-NO", { month: "short", day: "numeric", year: "numeric" });
    return `${startMonth} \u2013 ${endMonth}`;
  }, [windowStart]);

  // Selection -> assign
  useEffect(() => {
    if (isSelecting || !selection || !activeTool) return;
    const apply = async () => {
      if (activeTool === "__eraser__") {
        await clearAllocations({
          entryIds: selection.entryIds,
          startDate: selection.startDate,
          endDate: selection.endDate,
        });
      } else {
        await bulkSetAllocations({
          entryIds: selection.entryIds,
          startDate: selection.startDate,
          endDate: selection.endDate,
          label: activeTool,
        });
      }
      clearSelection();
      fetchGridData();
    };
    apply();
  }, [isSelecting, selection, activeTool, clearSelection, fetchGridData]);

  const selectedDates = useMemo(() => {
    if (!selection) return new Set<string>();
    const set = new Set<string>();
    const start = new Date(selection.startDate);
    const end = new Date(selection.endDate);
    const cursor = new Date(start);
    while (cursor <= end) {
      set.add(formatDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return set;
  }, [selection]);

  const selectedEntryIds = useMemo(() => new Set(selection?.entryIds ?? []), [selection]);

  // Find allocation data for a cell
  const findAllocationForCell = useCallback(
    (entryId: string, date: string) => {
      const entry = entries.find((en) => en.id === entryId);
      if (!entry) return undefined;
      for (const alloc of entry.allocations) {
        const s = new Date(alloc.startDate);
        const e = new Date(alloc.endDate);
        const d = new Date(date);
        if (d >= s && d <= e) return alloc;
      }
      return undefined;
    },
    [entries]
  );

  // Context menu
  const handleCellContextMenu = useCallback(
    (e: React.MouseEvent, entryId: string, date: string) => {
      e.preventDefault();
      setPopover(null);
      const alloc = findAllocationForCell(entryId, date);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        entryId,
        date,
        currentLabel: alloc?.label,
        jobId: alloc?.jobAssignment?.job?.id,
        jobName: alloc?.jobAssignment?.job?.name,
        projectId: alloc?.jobAssignment?.job?.project?.id,
        projectName: alloc?.jobAssignment?.job?.project?.name,
      });
    },
    [findAllocationForCell]
  );

  // Cell click -> show popover (only when no tool active)
  const handleCellClick = useCallback(
    (e: React.MouseEvent, entryId: string, date: string) => {
      if (activeTool) return; // Don't show popover when assigning
      setContextMenu(null);
      const alloc = findAllocationForCell(entryId, date);
      if (!alloc) return;
      const labelDef = colorMap.get(alloc.label);
      setPopover({
        x: e.clientX,
        y: e.clientY,
        entryId,
        date,
        label: alloc.label,
        labelColor: labelDef?.color,
        labelTextColor: labelDef?.textColor,
        jobId: alloc.jobAssignment?.job?.id,
        jobName: alloc.jobAssignment?.job?.name,
        projectId: alloc.jobAssignment?.job?.project?.id,
        projectName: alloc.jobAssignment?.job?.project?.name,
        jobLocation: alloc.jobAssignment?.job?.location,
        source: alloc.source,
      });
    },
    [activeTool, findAllocationForCell, colorMap]
  );

  const handleContextAssign = useCallback(async (labelName: string) => {
    if (!contextMenu) return;
    await bulkSetAllocations({
      entryIds: [contextMenu.entryId],
      startDate: contextMenu.date,
      endDate: contextMenu.date,
      label: labelName,
    });
    setContextMenu(null);
    fetchGridData();
  }, [contextMenu, fetchGridData]);

  const handleContextClear = useCallback(async () => {
    if (!contextMenu) return;
    await clearAllocations({
      entryIds: [contextMenu.entryId],
      startDate: contextMenu.date,
      endDate: contextMenu.date,
    });
    setContextMenu(null);
    fetchGridData();
  }, [contextMenu, fetchGridData]);

  const handlePopoverClear = useCallback(async () => {
    if (!popover) return;
    await clearAllocations({
      entryIds: [popover.entryId],
      startDate: popover.date,
      endDate: popover.date,
    });
    setPopover(null);
    fetchGridData();
  }, [popover, fetchGridData]);

  const handleEntryClick = useCallback((entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (entry) setEditingEntry(entry);
  }, [entries]);

  const handleFilterChange = useCallback(
    (newFilters: { search?: string; crew?: string; company?: string; location?: string; jobId?: string }) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const handleExport = useCallback(() => {
    const params = new URLSearchParams({ planId, year: year.toString() });
    window.open(`/api/resource-plan/export?${params}`, "_blank");
  }, [planId, year]);

  const handleAddEntry = useCallback(() => {
    fetchGridData();
  }, [fetchGridData]);

  const handleRefreshLabels = useCallback(async () => {
    const res = await fetch(`/api/resource-plan/labels?planId=${planId}`);
    if (res.ok) {
      const data = await res.json();
      setLabels(data);
    }
  }, [planId]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200/80 shadow-sm overflow-hidden">
      <GridToolbar
        crews={crews}
        companies={companies}
        locations={locations}
        labels={labels}
        activeJobs={activeJobs}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onFilterChange={handleFilterChange}
        onNavigate={handleNavigate}
        onExport={handleExport}
        onManageLabels={() => setShowLabelManager(true)}
        onAddEntry={handleAddEntry}
        planId={planId}
        currentPeriodLabel={currentPeriodLabel}
        activeFilters={filters}
      />

      <div
        ref={gridRef}
        className="flex-1 overflow-auto relative"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center">
            <div className="text-sm text-muted-foreground animate-pulse">Laster...</div>
          </div>
        )}

        <div
          className="grid"
          style={{ gridTemplateColumns: `200px 80px 70px 100px repeat(${dates.length}, 32px)` }}
        >
          <GridHeader dates={dates} todayStr={todayStr} />

          {Array.from(groupedEntries.entries()).map(([crew, crewEntries]) => (
            <div key={crew} className="contents">
              <div
                className="h-7 bg-[oklch(0.16_0.035_250)] text-white text-[11px] font-semibold flex items-center px-3 tracking-wide"
                style={{ gridColumn: "1 / -1", fontFamily: "var(--font-display)" }}
              >
                {crew}
                <span className="ml-1.5 text-white/50 font-normal">({crewEntries.length})</span>
              </div>
              {crewEntries.map((entry) => (
                <GridRow
                  key={entry.id}
                  entryId={entry.id}
                  displayName={entry.displayName}
                  crew={entry.crew}
                  company={entry.company}
                  location={entry.location}
                  personnelId={entry.personnel?.id ?? null}
                  allocations={entry.allocations}
                  dates={dates}
                  weekendSet={weekendSet}
                  todayStr={todayStr}
                  selectedDates={selectedDates}
                  isEntrySelected={selectedEntryIds.has(entry.id)}
                  colorMap={colorMap}
                  onCellMouseDown={handleCellMouseDown}
                  onCellMouseEnter={handleCellMouseEnter}
                  onCellContextMenu={handleCellContextMenu}
                  onEntryClick={handleEntryClick}
                  onCellClick={handleCellClick}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <GridSummary entries={filteredEntries} dates={dates} colorMap={colorMap} />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          labels={labels}
          currentLabel={contextMenu.currentLabel}
          jobId={contextMenu.jobId}
          jobName={contextMenu.jobName}
          projectId={contextMenu.projectId}
          projectName={contextMenu.projectName}
          onAssign={handleContextAssign}
          onClear={handleContextClear}
          onClose={() => setContextMenu(null)}
        />
      )}

      {popover && (
        <AllocationPopover
          x={popover.x}
          y={popover.y}
          label={popover.label}
          labelColor={popover.labelColor}
          labelTextColor={popover.labelTextColor}
          jobId={popover.jobId}
          jobName={popover.jobName}
          projectId={popover.projectId}
          projectName={popover.projectName}
          jobLocation={popover.jobLocation}
          date={popover.date}
          source={popover.source}
          onClear={handlePopoverClear}
          onClose={() => setPopover(null)}
        />
      )}

      {showLabelManager && (
        <LabelManager
          planId={planId}
          labels={labels}
          onClose={() => setShowLabelManager(false)}
          onRefresh={handleRefreshLabels}
        />
      )}

      {editingEntry && (
        <EntryEditor
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onRefresh={() => { setEditingEntry(null); fetchGridData(); }}
        />
      )}
    </div>
  );
}
