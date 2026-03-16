"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import {
  addNote,
  type ActionState,
} from "@/app/(authenticated)/personell/[id]/actions";

interface Note {
  id: string;
  content: string;
  authorName: string;
  createdAt: Date;
}

interface PersonnelNotesTabProps {
  personnelId: string;
  notes: Note[];
}

export function PersonnelNotesTab({
  personnelId,
  notes,
}: PersonnelNotesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    addNote,
    {}
  );

  return (
    <div className="space-y-3">
      {showForm ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Nytt notat</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowForm(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <form action={formAction} className="space-y-2">
              <input type="hidden" name="personnelId" value={personnelId} />
              <Textarea
                name="content"
                placeholder="Skriv et notat..."
                rows={2}
                required
              />
              {state.errors?.content && (
                <p className="text-xs text-destructive">
                  {state.errors.content[0]}
                </p>
              )}
              {state.message && (
                <p
                  className={`text-xs ${state.success ? "text-emerald-600" : "text-destructive"}`}
                >
                  {state.message}
                </p>
              )}
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Lagrer..." : "Legg til"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nytt notat
        </Button>
      )}

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-xs text-muted-foreground">
            Ingen notater ennå.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {notes.map((note) => (
                <div key={note.id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs whitespace-pre-wrap flex-1">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {note.authorName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {note.createdAt.toLocaleDateString("nb-NO")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
