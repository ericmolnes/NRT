import { notFound } from "next/navigation";
import { getEvaluationById } from "@/lib/queries/evaluations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/evaluering/score-badge";
import { EVALUATION_CRITERIA } from "@/lib/validations/evaluation";
import { ArrowLeft, User, Briefcase, Calendar, MessageSquare } from "lucide-react";
import Link from "next/link";
import { DeleteButton } from "@/components/personell/delete-button";
import { deleteEvaluation } from "@/app/(authenticated)/personell/[id]/actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EvaluationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const evaluation = await getEvaluationById(id);

  if (!evaluation) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href="/evaluering" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Evaluering av {evaluation.personnel.name}
          </h1>
          <p className="text-muted-foreground">
            Utført {evaluation.createdAt.toLocaleDateString("nb-NO")} av{" "}
            {evaluation.evaluatorName}
          </p>
        </div>
        <DeleteButton
          action={deleteEvaluation.bind(null, evaluation.id)}
          label="Slett evaluering"
        />
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Personellinformasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Navn</p>
                <Link
                  href={`/personell/${evaluation.personnelId}`}
                  className="font-medium hover:underline"
                >
                  {evaluation.personnel.name}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Rolle</p>
                <p className="font-medium">{evaluation.personnel.role}</p>
              </div>
            </div>
            {evaluation.personnel.rig && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Rigg</p>
                  <p className="font-medium">{evaluation.personnel.rig}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totalvurdering</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold">{evaluation.score}</span>
              <span className="text-2xl text-muted-foreground">/10</span>
              <ScoreBadge score={evaluation.score} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detaljscorer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                // If criteriaScores JSON exists, use it for display
                const customScores = (evaluation as unknown as Record<string, unknown>).criteriaScores as Record<string, number> | null;
                if (customScores && Object.keys(customScores).length > 0) {
                  // Separate parent scores (no dot) and sub-scores (parent.child)
                  const parentKeys = Object.keys(customScores).filter((k) => !k.includes("."));
                  const subScores = Object.entries(customScores).filter(([k]) => k.includes("."));

                  return parentKeys.map((key) => {
                    const value = customScores[key];
                    const children = subScores.filter(([k]) => k.startsWith(key + "."));
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{key}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{value}/10</span>
                            <ScoreBadge score={value} />
                            {children.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">(snitt)</span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              value >= 8 ? "bg-emerald-500" : value >= 5 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${value * 10}%` }}
                          />
                        </div>
                        {children.length > 0 && (
                          <div className="ml-4 mt-1 space-y-1 border-l-2 border-muted pl-3">
                            {children.map(([subKey, subVal]) => {
                              const subLabel = subKey.split(".").pop() ?? subKey;
                              return (
                                <div key={subKey} className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">{subLabel}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium tabular-nums">{subVal}/10</span>
                                    <ScoreBadge score={subVal} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                }
                // Default: use fixed columns
                return EVALUATION_CRITERIA.map((criterion) => {
                  const value = evaluation[criterion.key as keyof typeof evaluation] as number;
                  return (
                    <div key={criterion.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{criterion.label}</span>
                          <p className="text-xs text-muted-foreground">{criterion.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{value}/10</span>
                          <ScoreBadge score={value} />
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            value >= 8 ? "bg-emerald-500" : value >= 5 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${value * 10}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>

        {evaluation.comment && (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Kommentar
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted p-4">
                {evaluation.comment}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
