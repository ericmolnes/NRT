"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotationPreview } from "@/components/rotasjoner/rotation-preview";
import { assignPersonnel, removeAssignment } from "@/app/(authenticated)/jobber/[id]/actions";
import { ArrowLeft, Plus, UserMinus, Calendar, Search, Check, User, MapPin, Briefcase, FolderKanban, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SegmentType } from "@/generated/prisma/client";
import { getInitials } from "@/lib/utils";

interface Personnel {
  id: string;
  name: string;
  role: string;
  department: string | null;
}

interface Assignment {
  id: string;
  startDate: Date | string;
  endDate: Date | string | null;
  isActive: boolean;
  notes: string | null;
  personnel: { id: string; name: string; role: string; department: string | null; status: string };
  rotationPattern: { id: string; name: string } | null;
  _count: { allocations: number };
}

interface JobData {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  location: string;
  startDate: Date | string;
  endDate: Date | string | null;
  resourcePlanLabelName: string | null;
  project: {
    id: string;
    name: string;
    customer: { id: string; name: string };
  };
  rotationPattern: {
    id: string;
    name: string;
    totalCycleDays: number;
    segments: { type: SegmentType; days: number; sortOrder: number; label: string | null }[];
  } | null;
  assignments: Assignment[];
}

export function JobDetail({ job }: { job: JobData }) {
  const [showAssignForm, setShowAssignForm] = useState(false);
  const router = useRouter();

  const handleRemove = async (assignmentId: string, name: string) => {
    if (!confirm(`Fjern ${name} fra denne jobben? Genererte tilordninger i ressursplanen slettes.`)) return;
    await removeAssignment(assignmentId);
    router.refresh();
  };

  const startStr = new Date(job.startDate).toLocaleDateString("nb-NO");
  const endStr = job.endDate ? new Date(job.endDate).toLocaleDateString("nb-NO") : "L\u00f8pende";
  const assignedIds = new Set(job.assignments.map((a) => a.personnel.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/jobber">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {job.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/kunder/${job.project.customer.id}`} className="hover:underline hover:text-foreground transition-colors">
              {job.project.customer.name}
            </Link>
            <span>\u00b7</span>
            <Link href={`/prosjekter/${job.project.id}`} className="hover:underline hover:text-foreground transition-colors">
              {job.project.name}
            </Link>
            <StatusBadge status={job.status} />
          </div>
        </div>
      </div>

      {/* Info */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Lokasjon
            </span>
            <p className="font-medium mt-0.5">{job.location}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Periode
            </span>
            <p className="font-medium mt-0.5">{startStr} \u2014 {endStr}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> Type
            </span>
            <p className="font-medium mt-0.5">{job.type === "TIME_LIMITED" ? "Tidsavgrenset" : "L\u00f8pende"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <FolderKanban className="h-3 w-3" /> Prosjekt
            </span>
            <p className="font-medium mt-0.5">{job.project.name}</p>
          </div>
        </div>
        {job.description && <p className="text-sm text-muted-foreground mt-3 border-t pt-3">{job.description}</p>}
      </Card>

      {/* Rotation */}
      {job.rotationPattern && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-2">Rotasjonsm\u00f8nster: {job.rotationPattern.name}</h2>
          <RotationPreview
            segments={job.rotationPattern.segments}
            totalDays={job.rotationPattern.totalCycleDays}
          />
        </Card>
      )}

      {/* Assignments */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Tilordnet personell ({job.assignments.filter((a) => a.isActive).length})
          </h2>
          {!showAssignForm && (
            <Button size="sm" className="gap-1" onClick={() => setShowAssignForm(true)}>
              <Plus className="h-3.5 w-3.5" />
              Tilordne personell
            </Button>
          )}
        </div>

        {showAssignForm && (
          <PersonnelPicker
            jobId={job.id}
            jobStartDate={new Date(job.startDate).toISOString().split("T")[0]}
            assignedIds={assignedIds}
            onDone={() => { setShowAssignForm(false); router.refresh(); }}
            onCancel={() => setShowAssignForm(false)}
          />
        )}

        <div className="space-y-1">
          {job.assignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 group transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[oklch(0.16_0.035_250)]/10 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-semibold text-[oklch(0.16_0.035_250)]">
                    {getInitials(assignment.personnel.name)}
                  </span>
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/personell/${assignment.personnel.id}`}
                    className="text-sm font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    {assignment.personnel.name}
                    <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50" />
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{assignment.personnel.role}</span>
                    {assignment.rotationPattern && <span>\u00b7 {assignment.rotationPattern.name}</span>}
                    <span>\u00b7 {assignment._count.allocations} allokeringer</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!assignment.isActive && <Badge variant="secondary" className="text-[10px]">Inaktiv</Badge>}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemove(assignment.id, assignment.personnel.name)}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {job.assignments.length === 0 && !showAssignForm && (
            <div className="flex flex-col items-center py-8 text-center">
              <User className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Ingen personell tilordnet enn\u00e5</p>
            </div>
          )}
        </div>
      </Card>

      {/* Resource plan link */}
      {job.resourcePlanLabelName && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Ressursplan</h2>
              <p className="text-xs text-muted-foreground">Label: {job.resourcePlanLabelName}</p>
            </div>
            <Link href="/ressursplan">
              <Button variant="outline" size="sm" className="gap-1">
                Se i ressursplanen
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Personnel Picker Component ──────────────────────────────

function PersonnelPicker({
  jobId,
  jobStartDate,
  assignedIds,
  onDone,
  onCancel,
}: {
  jobId: string;
  jobStartDate: string;
  assignedIds: Set<string>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(jobStartDate);
  const [endDate, setEndDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : "";
    fetch(`/api/personell/list${params}`)
      .then((r) => r.json())
      .then((data) => setPersonnel(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  const togglePerson = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (selected.size === 0) return;
    setAssigning(true);
    setError(null);

    const result = await assignPersonnel({
      jobId,
      personnelIds: Array.from(selected),
      startDate,
      endDate: endDate || undefined,
    });

    setAssigning(false);
    if (result.success) {
      onDone();
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <div className="mb-4 border rounded-xl overflow-hidden bg-white">
      {/* Search */}
      <div className="p-3 border-b bg-[oklch(0.96_0.005_250)]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="S\u00f8k ansatt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            autoFocus
          />
        </div>
        {selected.size > 0 && (
          <div className="mt-2 flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Valgt:</span>
            {Array.from(selected).map((id) => {
              const person = personnel.find((p) => p.id === id);
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="text-[10px] h-5 gap-1 pr-1 cursor-pointer hover:bg-red-100"
                  onClick={() => togglePerson(id)}
                >
                  {person?.name ?? id}
                  <span className="text-red-400">\u00d7</span>
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Personnel list */}
      <div className="max-h-52 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-6 animate-pulse">Laster ansatte...</p>
        ) : personnel.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {search ? "Ingen treff" : "Ingen ansatte"}
          </p>
        ) : (
          personnel.map((person) => {
            const isAssigned = assignedIds.has(person.id);
            const isSelected = selected.has(person.id);
            return (
              <button
                key={person.id}
                type="button"
                disabled={isAssigned}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  isAssigned
                    ? "opacity-40 cursor-not-allowed bg-gray-50"
                    : isSelected
                    ? "bg-[oklch(0.95_0.02_220)]"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => !isAssigned && togglePerson(person.id)}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? "bg-[oklch(0.16_0.035_250)] border-[oklch(0.16_0.035_250)]" : "border-gray-300"
                }`}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-semibold text-muted-foreground">
                    {getInitials(person.name)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{person.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {person.role}
                    {person.department && ` \u00b7 ${person.department}`}
                  </p>
                </div>
                {isAssigned && (
                  <Badge variant="outline" className="text-[9px] shrink-0">Allerede tilordnet</Badge>
                )}
              </button>
            );
          })
        )}
        {personnel.length >= 50 && (
          <p className="text-[10px] text-muted-foreground text-center py-2 border-t">
            Viser maks 50 \u2014 s\u00f8k for \u00e5 filtrere
          </p>
        )}
      </div>

      {/* Date selection + submit */}
      <div className="p-3 border-t bg-[oklch(0.96_0.005_250)]">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label className="text-xs">Startdato</Label>
            <Input
              type="date"
              className="h-8 mt-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label className="text-xs">Sluttdato (valgfritt)</Label>
            <Input
              type="date"
              className="h-8 mt-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive mb-2">{error}</p>}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selected.size} person{selected.size !== 1 ? "er" : ""} valgt
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Avbryt
            </Button>
            <Button
              size="sm"
              disabled={selected.size === 0 || assigning}
              onClick={handleAssign}
            >
              {assigning ? "Tilordner..." : `Tilordne ${selected.size > 0 ? `(${selected.size})` : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Utkast", className: "bg-zinc-500/15 text-zinc-600 border-zinc-300/50" },
    ACTIVE: { label: "Aktiv", className: "bg-emerald-500/15 text-emerald-700 border-emerald-300/50" },
    ON_HOLD: { label: "P\u00e5 vent", className: "bg-amber-500/15 text-amber-700 border-amber-300/50" },
    COMPLETED: { label: "Fullf\u00f8rt", className: "bg-blue-500/15 text-blue-700 border-blue-300/50" },
    CANCELLED: { label: "Kansellert", className: "bg-red-500/15 text-red-600 border-red-300/50" },
  };
  const c = config[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={`text-[10px] ${c.className}`}>{c.label}</Badge>;
}
