"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { StaffingHeader } from "./staffing-header";
import { StaffingToolbar } from "./staffing-toolbar";
import { StaffingSummary } from "./staffing-summary";
import {
  CustomerRow,
  JobRow,
  PersonRow,
  EmptyJobRow,
  AvailablePersonRow,
} from "./staffing-row";
import { formatDate, getDateRange } from "@/lib/resource-plan-utils";
import { ChevronDown, UserX } from "lucide-react";

// Client-side type definitions (match server types)
interface StaffingAllocation {
  startDate: Date | string;
  endDate: Date | string;
  label: string;
  source: string;
}

interface StaffingAssignment {
  id: string;
  personnel: { id: string; name: string; role: string; department: string | null; status: string };
  allocations: StaffingAllocation[];
  rotationPattern: { id: string; name: string } | null;
}

interface StaffingJob {
  id: string;
  name: string;
  location: string;
  status: string;
  type: string;
  startDate: Date | string;
  endDate: Date | string | null;
  resourcePlanLabelName: string | null;
  assignments: StaffingAssignment[];
}

interface StaffingCustomer {
  id: string;
  name: string;
  jobs: StaffingJob[];
}

interface StaffingPlanData {
  customers: StaffingCustomer[];
  available: { id: string; name: string; role: string; department: string | null; status: string }[];
  stats: { totalJobs: number; totalAssigned: number; totalAvailable: number; totalCustomers: number };
}

const CELL_W = 20;
const NAME_W = 220;
const WEEKS_VISIBLE = 8;
const DAYS_VISIBLE = WEEKS_VISIBLE * 7;
const SCROLL_WEEKS = 4;

// Deterministic colors per job
const JOB_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
  "#6366f1", "#22c55e", "#eab308", "#a855f7", "#f43f5e",
];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

interface StaffingPlanGridProps {
  initialData: StaffingPlanData;
  initialStartDate: string; // YYYY-MM-DD
}

export function StaffingPlanGrid({
  initialData,
  initialStartDate,
}: StaffingPlanGridProps) {
  const [data, setData] = useState(initialData);
  const [windowStart, setWindowStart] = useState(() => new Date(initialStartDate + "T00:00:00"));
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Generate dates for the visible window
  const dates = useMemo(() => {
    const end = new Date(windowStart);
    end.setDate(end.getDate() + DAYS_VISIBLE - 1);
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

  // Period label for toolbar
  const periodLabel = useMemo(() => {
    const endD = new Date(windowStart);
    endD.setDate(endD.getDate() + DAYS_VISIBLE - 1);
    const s = windowStart.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
    const e = endD.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
    return `${s} \u2013 ${e}`;
  }, [windowStart]);

  // Assign colors to jobs
  const jobColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let idx = 0;
    for (const customer of data.customers) {
      for (const job of customer.jobs) {
        map.set(job.id, JOB_COLORS[idx % JOB_COLORS.length]);
        idx++;
      }
    }
    return map;
  }, [data.customers]);

  // Fetch data when window or search changes
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = formatDate(windowStart);
      const endD = new Date(windowStart);
      endD.setDate(endD.getDate() + DAYS_VISIBLE - 1);
      const endDate = formatDate(endD);

      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(search && { search }),
      });
      const res = await fetch(`/api/resource-plan/grid?${params}`);
      if (res.ok) {
        const newData = await res.json();
        setData(newData);
      }
    } finally {
      setIsLoading(false);
    }
  }, [windowStart, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNavigate = useCallback((direction: "prev" | "next" | "today") => {
    setWindowStart((prev) => {
      if (direction === "today") return getMondayOfWeek(new Date());
      const d = new Date(prev);
      d.setDate(d.getDate() + (direction === "next" ? SCROLL_WEEKS * 7 : -SCROLL_WEEKS * 7));
      return d;
    });
  }, []);

  const handleSearchChange = useCallback((s: string) => {
    setSearch(s);
  }, []);

  const handleExport = useCallback(() => {
    const y = windowStart.getFullYear();
    window.open(`/api/resource-plan/export?year=${y}`, "_blank");
  }, [windowStart]);

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200/80 shadow-sm overflow-hidden">
      <StaffingToolbar
        periodLabel={periodLabel}
        onNavigate={handleNavigate}
        onSearchChange={handleSearchChange}
        onExport={handleExport}
      />

      <div className="flex-1 overflow-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center">
            <div className="text-sm text-muted-foreground animate-pulse">Laster...</div>
          </div>
        )}

        <div
          className="grid"
          style={{ gridTemplateColumns: `${NAME_W}px repeat(${dates.length}, ${CELL_W}px)` }}
        >
          <StaffingHeader dates={dates} todayStr={todayStr} />

          {data.customers.map((customer) => {
            const customerKey = `c-${customer.id}`;
            const isCustomerCollapsed = collapsed.has(customerKey);
            const totalAssigned = customer.jobs.reduce(
              (sum, j) => sum + j.assignments.length, 0
            );

            return (
              <div key={customer.id} className="contents">
                <CustomerRow
                  name={customer.name}
                  customerId={customer.id}
                  jobCount={customer.jobs.length}
                  assignedCount={totalAssigned}
                  isExpanded={!isCustomerCollapsed}
                  onToggle={() => toggleCollapse(customerKey)}
                  dateCount={dates.length}
                />

                {!isCustomerCollapsed &&
                  customer.jobs.map((job) => {
                    const jobKey = `j-${job.id}`;
                    const isJobCollapsed = collapsed.has(jobKey);
                    const jobColor = jobColorMap.get(job.id) ?? "#6b7280";

                    return (
                      <div key={job.id} className="contents">
                        <JobRow
                          name={job.name}
                          jobId={job.id}
                          location={job.location}
                          status={job.status}
                          assignedCount={job.assignments.length}
                          isExpanded={!isJobCollapsed}
                          onToggle={() => toggleCollapse(jobKey)}
                          dateCount={dates.length}
                        />

                        {!isJobCollapsed && (
                          <>
                            {job.assignments.length > 0 ? (
                              job.assignments.map((assignment) => (
                                <PersonRow
                                  key={assignment.id}
                                  personnelId={assignment.personnel.id}
                                  name={assignment.personnel.name}
                                  role={assignment.personnel.role}
                                  allocations={assignment.allocations}
                                  dates={dates}
                                  weekendSet={weekendSet}
                                  todayStr={todayStr}
                                  jobColor={jobColor}
                                />
                              ))
                            ) : (
                              <EmptyJobRow jobId={job.id} dateCount={dates.length} />
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })}

          {/* Available section */}
          {data.available.length > 0 && (
            <div className="contents">
              <div
                className="flex cursor-pointer select-none"
                style={{ gridColumn: "1 / -1" }}
                onClick={() => toggleCollapse("available")}
              >
                <div
                  className="sticky left-0 z-20 h-8 bg-amber-600 text-white flex items-center gap-2 px-2 shrink-0"
                  style={{ width: NAME_W, fontFamily: "var(--font-display)" }}
                >
                  {collapsed.has("available") ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/60 -rotate-90" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/60" />
                  )}
                  <UserX className="h-3.5 w-3.5 text-white/70" />
                  <span className="text-[11px] font-semibold">Ledig / Tilgjengelig</span>
                  <span className="text-[9px] text-white/50 ml-auto">{data.available.length} pers</span>
                </div>
                <div
                  className="h-8 bg-amber-600 border-b border-amber-500"
                  style={{ width: dates.length * CELL_W }}
                />
              </div>

              {!collapsed.has("available") &&
                data.available.map((person) => (
                  <AvailablePersonRow
                    key={person.id}
                    personnelId={person.id}
                    name={person.name}
                    role={person.role}
                    dateCount={dates.length}
                  />
                ))}
            </div>
          )}

          {data.customers.length === 0 && data.available.length === 0 && (
            <div
              className="flex items-center justify-center py-16 text-center"
              style={{ gridColumn: "1 / -1" }}
            >
              <div>
                <UserX className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Ingen aktive jobber eller ansatte funnet</p>
                <p className="text-xs text-muted-foreground mt-1">Opprett jobber og tilordne personell for \u00e5 se dem her</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <StaffingSummary
        totalJobs={data.stats.totalJobs}
        totalAssigned={data.stats.totalAssigned}
        totalAvailable={data.stats.totalAvailable}
        totalCustomers={data.stats.totalCustomers}
      />
    </div>
  );
}
