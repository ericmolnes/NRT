"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotationPreview } from "@/components/rotasjoner/rotation-preview";
import { assignPersonnel, removeAssignment } from "@/app/(authenticated)/jobber/[id]/actions";
import { ArrowLeft, Plus, UserMinus, Calendar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SegmentType } from "@/generated/prisma/client";

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
  const [assigning, setAssigning] = useState(false);
  const router = useRouter();

  const handleAssign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAssigning(true);
    const fd = new FormData(e.currentTarget);
    const personnelIds = (fd.get("personnelIds") as string).split(",").map((s) => s.trim()).filter(Boolean);
    const startDate = fd.get("startDate") as string;

    await assignPersonnel({
      jobId: job.id,
      personnelIds,
      startDate,
      endDate: (fd.get("endDate") as string) || undefined,
    });

    setAssigning(false);
    setShowAssignForm(false);
    router.refresh();
  };

  const handleRemove = async (assignmentId: string, name: string) => {
    if (!confirm(`Fjern ${name} fra denne jobben? Genererte tilordninger i ressursplanen slettes.`)) return;
    await removeAssignment(assignmentId);
    router.refresh();
  };

  const startStr = new Date(job.startDate).toLocaleDateString("nb-NO");
  const endStr = job.endDate ? new Date(job.endDate).toLocaleDateString("nb-NO") : "Løpende";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/jobber">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold">{job.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/kunder/${job.project.customer.id}`} className="hover:underline">
              {job.project.customer.name}
            </Link>
            <span>·</span>
            <Link href={`/prosjekter/${job.project.id}`} className="hover:underline">
              {job.project.name}
            </Link>
            <Badge variant={job.status === "ACTIVE" ? "default" : "secondary"}>{job.status}</Badge>
          </div>
        </div>
      </div>

      {/* Info */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Lokasjon</span>
            <p className="font-medium">{job.location}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Periode</span>
            <p className="font-medium flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {startStr} — {endStr}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Type</span>
            <p className="font-medium">{job.type === "TIME_LIMITED" ? "Tidsavgrenset" : "Løpende"}</p>
          </div>
        </div>
        {job.description && <p className="text-sm text-muted-foreground mt-3">{job.description}</p>}
      </Card>

      {/* Rotasjon */}
      {job.rotationPattern && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-2">Rotasjonsmønster: {job.rotationPattern.name}</h2>
          <RotationPreview
            segments={job.rotationPattern.segments}
            totalDays={job.rotationPattern.totalCycleDays}
          />
        </Card>
      )}

      {/* Tilordninger */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">
            Tilordnet personell ({job.assignments.filter((a) => a.isActive).length})
          </h2>
          <Button size="sm" className="gap-1" onClick={() => setShowAssignForm(true)}>
            <Plus className="h-4 w-4" />
            Tilordne personell
          </Button>
        </div>

        {showAssignForm && (
          <form onSubmit={handleAssign} className="p-3 bg-blue-50 rounded-lg mb-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Skriv inn personell-IDer (kommaseparert). I fremtidig versjon: søk og velg fra liste.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Personell-IDer</Label>
                <Input name="personnelIds" className="h-8 text-sm" placeholder="id1, id2, id3" required />
              </div>
              <div>
                <Label className="text-xs">Startdato</Label>
                <Input
                  name="startDate"
                  type="date"
                  className="h-8"
                  defaultValue={new Date(job.startDate).toISOString().split("T")[0]}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={assigning}>
                {assigning ? "Tilordner..." : "Tilordne"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAssignForm(false)}>
                Avbryt
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {job.assignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 group">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-sm font-medium">{assignment.personnel.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{assignment.personnel.role}</span>
                    {assignment.rotationPattern && <span>· {assignment.rotationPattern.name}</span>}
                    <span>· {assignment._count.allocations} allokeringer</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!assignment.isActive && <Badge variant="secondary">Inaktiv</Badge>}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                  onClick={() => handleRemove(assignment.id, assignment.personnel.name)}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {job.assignments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Ingen personell tilordnet</p>
          )}
        </div>
      </Card>

      {/* Ressursplan-link */}
      {job.resourcePlanLabelName && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Ressursplan</h2>
              <p className="text-xs text-muted-foreground">Label: {job.resourcePlanLabelName}</p>
            </div>
            <Link href="/ressursplan">
              <Button variant="outline" size="sm">Se i ressursplanen</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
