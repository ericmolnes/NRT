"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreSelector } from "@/components/evaluering/score-selector";
import { EVALUATION_CRITERIA } from "@/lib/validations/evaluation";
import {
  submitPublicEvaluation,
  type PublicActionState,
} from "@/app/(public)/s/[token]/actions";
import { CheckCircle2 } from "lucide-react";

interface Personnel {
  id: string;
  name: string;
  role: string;
}

interface PublicEvaluationFormProps {
  token: string;
  personnel: Personnel[];
  lockedPersonnelId: string | null;
}

export function PublicEvaluationForm({
  token,
  personnel,
  lockedPersonnelId,
}: PublicEvaluationFormProps) {
  const [state, formAction, isPending] = useActionState<
    PublicActionState,
    FormData
  >(submitPublicEvaluation, {});

  if (state.success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold">Takk for evalueringen!</h2>
            <p className="text-muted-foreground">
              Evalueringen er registrert.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fyll ut evalueringen</CardTitle>
        <p className="text-sm text-muted-foreground">
          Alle felt med score er påkrevd. Gi en vurdering fra 1 (svakest) til 10
          (best).
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="evaluatorName">Ditt navn *</Label>
            <Input
              id="evaluatorName"
              name="evaluatorName"
              placeholder="Fullt navn"
              required
            />
            {state.errors?.evaluatorName && (
              <p className="text-sm text-destructive">
                {state.errors.evaluatorName[0]}
              </p>
            )}
          </div>

          {lockedPersonnelId ? (
            <input
              type="hidden"
              name="personnelId"
              value={lockedPersonnelId}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="personnelId">Hvem vil du evaluere? *</Label>
              <select
                id="personnelId"
                name="personnelId"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Velg personell...
                </option>
                {personnel.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {state.errors?.personnelId && (
                <p className="text-sm text-destructive">
                  {state.errors.personnelId[0]}
                </p>
              )}
            </div>
          )}

          <div className="space-y-5">
            {EVALUATION_CRITERIA.map((criterion) => (
              <div key={criterion.key} className="space-y-2">
                <div>
                  <Label>{criterion.label} *</Label>
                  <p className="text-xs text-muted-foreground">
                    {criterion.description}
                  </p>
                </div>
                <ScoreSelector name={criterion.key} />
                {state.errors?.[criterion.key] && (
                  <p className="text-sm text-destructive">
                    {state.errors[criterion.key]![0]}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Kommentar (valgfri)</Label>
            <Textarea
              id="comment"
              name="comment"
              placeholder="Skriv en kommentar..."
              rows={4}
            />
          </div>

          {state.message && !state.success && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Sender..." : "Send inn evaluering"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
