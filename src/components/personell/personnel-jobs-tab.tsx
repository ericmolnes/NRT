import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  CalendarDays,
  MapPin,
  RotateCcw,
  ClipboardList,
  Inbox,
} from "lucide-react";

interface PersonnelJobsTabProps {
  assignments: Array<{
    id: string;
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
    job: {
      id: string;
      name: string;
      location: string;
      status: string;
      project: {
        id: string;
        name: string;
        customer: { name: string };
      };
    };
    rotationPattern: { name: string } | null;
  }>;
  entries: Array<{
    id: string;
    displayName: string;
    crew: string | null;
    location: string | null;
    resourcePlan: { name: string; year: number };
    allocations: Array<{
      id: string;
      startDate: Date;
      endDate: Date;
      label: string;
    }>;
  }>;
}

function formatDate(date: Date | null): string {
  if (!date) return "–";
  return new Date(date).toLocaleDateString("nb-NO");
}

export function PersonnelJobsTab({
  assignments,
  entries,
}: PersonnelJobsTabProps) {
  const activeAssignments = assignments.filter((a) => a.isActive);
  const inactiveAssignments = assignments.filter((a) => !a.isActive);

  if (assignments.length === 0 && entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Inbox className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-xs text-muted-foreground">
          Ingen jobbtildelinger eller ressursplan-oppføringer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Aktive jobber */}
      {activeAssignments.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm">Aktive jobber</CardTitle>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                {activeAssignments.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {activeAssignments.map((assignment) => (
                <div key={assignment.id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <Link
                        href={`/jobber/${assignment.job.id}`}
                        className="text-xs font-medium hover:underline underline-offset-2"
                      >
                        {assignment.job.name}
                      </Link>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {assignment.job.project.name} &mdash;{" "}
                        {assignment.job.project.customer.name}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {assignment.job.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-2.5 w-2.5" />
                      {assignment.job.location}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CalendarDays className="h-2.5 w-2.5" />
                      {formatDate(assignment.startDate)}
                      {assignment.endDate
                        ? ` – ${formatDate(assignment.endDate)}`
                        : " –"}
                    </span>
                    {assignment.rotationPattern && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <RotateCcw className="h-2.5 w-2.5" />
                        {assignment.rotationPattern.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tidligere jobber */}
      {inactiveAssignments.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Tidligere jobber</CardTitle>
              <Badge variant="secondary">
                {inactiveAssignments.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {inactiveAssignments.map((assignment) => (
                <div key={assignment.id} className="px-4 py-2.5 opacity-70">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <Link
                        href={`/jobber/${assignment.job.id}`}
                        className="text-xs font-medium hover:underline underline-offset-2"
                      >
                        {assignment.job.name}
                      </Link>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {assignment.job.project.name} &mdash;{" "}
                        {assignment.job.project.customer.name}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {assignment.job.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-2.5 w-2.5" />
                      {assignment.job.location}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CalendarDays className="h-2.5 w-2.5" />
                      {formatDate(assignment.startDate)}
                      {assignment.endDate
                        ? ` – ${formatDate(assignment.endDate)}`
                        : " –"}
                    </span>
                    {assignment.rotationPattern && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <RotateCcw className="h-2.5 w-2.5" />
                        {assignment.rotationPattern.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ressursplan */}
      {entries.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm">Ressursplan</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {entries.map((entry) => (
                <div key={entry.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{entry.displayName}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {entry.resourcePlan.name} ({entry.resourcePlan.year})
                    </span>
                  </div>
                  {(entry.crew || entry.location) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {[entry.crew, entry.location].filter(Boolean).join(" / ")}
                    </p>
                  )}
                  {entry.allocations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {entry.allocations.map((alloc) => (
                        <Badge
                          key={alloc.id}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {alloc.label}: {formatDate(alloc.startDate)} –{" "}
                          {formatDate(alloc.endDate)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 && assignments.length > 0 && (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Ingen ressursplan-oppføringer.
          </p>
        </div>
      )}
    </div>
  );
}
