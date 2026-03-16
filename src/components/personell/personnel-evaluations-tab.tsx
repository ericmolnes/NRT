"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/evaluering/score-badge";
import { ScoreSelector } from "@/components/evaluering/score-selector";
import { EVALUATION_CRITERIA } from "@/lib/validations/evaluation";
import { Plus, X } from "lucide-react";
import {
  addEvaluationFromCard,
  type ActionState,
} from "@/app/(authenticated)/personell/[id]/actions";

interface Evaluation {
  id: string;
  score: number;
  hpiSafety: number;
  competence: number;
  collaboration: number;
  workEthic: number;
  independence: number;
  punctuality: number;
  comment: string | null;
  evaluatorName: string;
  createdAt: Date;
}

interface PersonnelEvaluationsTabProps {
  personnelId: string;
  evaluations: Evaluation[];
  evaluatorName: string;
}

export function PersonnelEvaluationsTab({
  personnelId,
  evaluations,
  evaluatorName,
}: PersonnelEvaluationsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    addEvaluationFromCard,
    {}
  );

  return (
    <div className="space-y-3">
      {/* New evaluation form — collapsed by default */}
      {showForm ? (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Ny evaluering</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowForm(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Evaluerer som:{" "}
              <span className="font-medium">{evaluatorName}</span>
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="personnelId" value={personnelId} />
              <div className="space-y-3">
                {EVALUATION_CRITERIA.map((criterion) => (
                  <div key={criterion.key} className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <Label className="text-xs">{criterion.label}</Label>
                      <span className="text-[10px] text-muted-foreground">
                        {criterion.description}
                      </span>
                    </div>
                    <ScoreSelector name={criterion.key} />
                    {state.errors?.[criterion.key] && (
                      <p className="text-xs text-destructive">
                        {state.errors[criterion.key]![0]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label htmlFor="comment" className="text-xs">
                  Kommentar (valgfri)
                </Label>
                <Textarea
                  id="comment"
                  name="comment"
                  placeholder="Skriv en kommentar..."
                  rows={2}
                />
              </div>
              {state.message && (
                <p
                  className={`text-xs ${state.success ? "text-emerald-600" : "text-destructive"}`}
                >
                  {state.message}
                </p>
              )}
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Lagrer..." : "Lagre evaluering"}
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
          Ny evaluering
        </Button>
      )}

      {/* Evaluation history — compact table-like cards */}
      {evaluations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-xs text-muted-foreground">
            Ingen evalueringer ennå.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {evaluations.map((evaluation) => (
                <div key={evaluation.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ScoreBadge score={evaluation.score} />
                      <span className="text-xs text-muted-foreground">
                        av {evaluation.evaluatorName}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {evaluation.createdAt.toLocaleDateString("nb-NO")}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {EVALUATION_CRITERIA.map((criterion) => {
                      const value = evaluation[
                        criterion.key as keyof typeof evaluation
                      ] as number;
                      return (
                        <div
                          key={criterion.key}
                          className="flex items-center justify-between rounded bg-muted/50 px-2 py-1"
                        >
                          <span className="text-[10px] text-muted-foreground truncate mr-1">
                            {criterion.label}
                          </span>
                          <span className="text-xs font-medium">
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {evaluation.comment && (
                    <p className="text-xs mt-2 text-muted-foreground whitespace-pre-wrap">
                      {evaluation.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
