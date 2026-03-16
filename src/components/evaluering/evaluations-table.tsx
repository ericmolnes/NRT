import { ScoreBadge } from "@/components/evaluering/score-badge";
import { DeleteButton } from "@/components/personell/delete-button";
import { deleteEvaluation } from "@/app/(authenticated)/personell/[id]/actions";
import type { Evaluation, Personnel } from "@/generated/prisma/client";
import Link from "next/link";

interface EvaluationsTableProps {
  evaluations: (Evaluation & { personnel: Personnel })[];
}

export function EvaluationsTable({ evaluations }: EvaluationsTableProps) {
  if (evaluations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          Ingen evalueringer ennå. Opprett den første evalueringen for å komme i
          gang.
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
              Totalsnitt
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
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
                  href={`/personell/${evaluation.personnelId}`}
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
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {evaluation.evaluatorName}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {evaluation.createdAt.toLocaleDateString("nb-NO")}
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteButton
                  action={deleteEvaluation.bind(null, evaluation.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
