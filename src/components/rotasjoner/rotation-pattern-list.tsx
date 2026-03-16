"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotationPreview } from "./rotation-preview";
import { RotationPatternForm } from "./rotation-pattern-form";
import { deleteRotationPattern } from "@/app/(authenticated)/rotasjoner/actions";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SegmentType } from "@/generated/prisma/client";

interface Pattern {
  id: string;
  name: string;
  description: string | null;
  totalCycleDays: number;
  isActive: boolean;
  segments: { type: SegmentType; days: number; sortOrder: number; label: string | null }[];
  _count: { jobs: number; assignments: number };
}

interface RotationPatternListProps {
  patterns: Pattern[];
}

export function RotationPatternList({ patterns }: RotationPatternListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pattern | null>(null);
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm("Slett dette rotasjonsmønsteret?")) return;
    await deleteRotationPattern(id);
    router.refresh();
  };

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" className="gap-1" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Nytt mønster
        </Button>
      </div>

      <div className="space-y-3">
        {patterns.map((pattern) => (
          <Card key={pattern.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{pattern.name}</h3>
                  {!pattern.isActive && <Badge variant="secondary">Deaktivert</Badge>}
                  <Badge variant="outline" className="text-[10px]">
                    {pattern.totalCycleDays} dager
                  </Badge>
                </div>
                {pattern.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{pattern.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {pattern._count.jobs} jobber, {pattern._count.assignments} tilordninger
                </p>
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditing(pattern)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(pattern.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <RotationPreview
              segments={pattern.segments}
              totalDays={pattern.totalCycleDays}
            />
          </Card>
        ))}

        {patterns.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Ingen rotasjonsmønstre opprettet ennå
          </p>
        )}
      </div>

      {(showForm || editing) && (
        <RotationPatternForm
          existing={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
}
