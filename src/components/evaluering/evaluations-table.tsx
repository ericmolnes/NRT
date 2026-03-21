import { ScoreBadge } from "@/components/evaluering/score-badge";
import { DeleteButton } from "@/components/personell/delete-button";
import { deleteEvaluation } from "@/app/(authenticated)/personell/[id]/actions";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, ExternalLink } from "lucide-react";
import type { Evaluation, Personnel } from "@/generated/prisma/client";
import Link from "next/link";

interface EvaluationsTableProps {
  evaluations: (Evaluation & { personnel: Personnel })[];
}

export function EvaluationsTable({ evaluations }: EvaluationsTableProps) {
  if (evaluations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground font-medium">
          Ingen evalueringer funnet
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Prøv å endre filtrene eller opprett en ny evaluering via
          evalueringsskjema.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Navn
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Rolle
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Score
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
              Evaluert av
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Dato
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
              Handling
            </th>
          </tr>
        </thead>
        <tbody>
          {evaluations.map((evaluation) => (
            <tr
              key={evaluation.id}
              className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/evaluering/${evaluation.id}`}
                  className="font-medium hover:underline"
                >
                  {evaluation.personnel.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {evaluation.personnel.role}
              </td>
              <td className="px-4 py-3">
                <ScoreBadge score={evaluation.score} />
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                {evaluation.evaluatorName}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {evaluation.createdAt.toLocaleDateString("nb-NO")}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/evaluering/${evaluation.id}`} />}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <DeleteButton
                    action={deleteEvaluation.bind(null, evaluation.id)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
