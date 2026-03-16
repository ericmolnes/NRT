"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createJob } from "@/app/(authenticated)/jobber/[id]/actions";
import { ArrowLeft, Plus, Briefcase } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Job {
  id: string;
  name: string;
  type: string;
  status: string;
  location: string;
  startDate: Date | string;
  endDate: Date | string | null;
  rotationPattern: { id: string; name: string } | null;
  _count: { assignments: number };
}

interface ProjectData {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  location: string | null;
  customer: { id: string; name: string };
  jobs: Job[];
}

export function ProjectDetail({ project }: { project: ProjectData }) {
  const [showJobForm, setShowJobForm] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/prosjekter">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/kunder/${project.customer.id}`} className="hover:underline">
              {project.customer.name}
            </Link>
            {project.code && <span>· {project.code}</span>}
            <Badge variant="outline">{project.status}</Badge>
          </div>
        </div>
      </div>

      {project.description && (
        <Card className="p-4">
          <p className="text-sm">{project.description}</p>
        </Card>
      )}

      {/* Jobber */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Jobber ({project.jobs.length})</h2>
          <Button size="sm" className="gap-1" onClick={() => setShowJobForm(true)}>
            <Plus className="h-4 w-4" />
            Ny jobb
          </Button>
        </div>

        <div className="space-y-2">
          {project.jobs.map((job) => (
            <Link key={job.id} href={`/jobber/${job.id}`}>
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium text-sm">{job.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{job.location}</span>
                      {job.rotationPattern && <span>· {job.rotationPattern.name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{job._count.assignments} pers.</span>
                  <Badge variant={job.status === "ACTIVE" ? "default" : "secondary"}>
                    {job.status}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
          {project.jobs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Ingen jobber opprettet ennå</p>
          )}
        </div>
      </Card>

      {showJobForm && (
        <NewJobDialog
          projectId={project.id}
          projectName={project.name}
          customerName={project.customer.name}
          onClose={() => setShowJobForm(false)}
          onCreated={() => { setShowJobForm(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function NewJobDialog({
  projectId,
  projectName,
  customerName,
  onClose,
  onCreated,
}: {
  projectId: string;
  projectName: string;
  customerName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  // Last rotasjonsmønstre via API
  if (!loaded) {
    fetch("/api/rotations")
      .then((res) => res.json())
      .then((data) => {
        setPatterns(data);
        setLoaded(true);
      });
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const result = await createJob({
      name: fd.get("name") as string,
      type: fd.get("type") as string,
      location: fd.get("location") as string,
      startDate: fd.get("startDate") as string,
      endDate: (fd.get("endDate") as string) || undefined,
      projectId,
      rotationPatternId: (fd.get("rotationPatternId") as string) || undefined,
    });

    setSaving(false);
    if (result.success) {
      onCreated();
      if (result.id) router.push(`/jobber/${result.id}`);
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[460px]" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h2 className="text-base font-semibold">Ny jobb for {customerName} - {projectName}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Jobbnavn *</Label>
            <Input name="name" className="h-8" required placeholder="F.eks. Elektro Q1 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type *</Label>
              <Select name="type" defaultValue="TIME_LIMITED">
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIME_LIMITED">Tidsavgrenset</SelectItem>
                  <SelectItem value="ONGOING">Løpende</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Lokasjon *</Label>
              <Input name="location" className="h-8" required placeholder="Aker Verdal" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Startdato *</Label>
              <Input name="startDate" type="date" className="h-8" required />
            </div>
            <div>
              <Label className="text-xs">Sluttdato</Label>
              <Input name="endDate" type="date" className="h-8" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Rotasjonsmønster</Label>
            <Select name="rotationPatternId">
              <SelectTrigger className="h-8"><SelectValue placeholder="Velg mønster..." /></SelectTrigger>
              <SelectContent>
                {patterns.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Avbryt</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Oppretter..." : "Opprett jobb"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
