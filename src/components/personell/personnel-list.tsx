import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/evaluering/score-badge";
import Link from "next/link";

interface PersonnelWithEvals {
  id: string;
  name: string;
  role: string;
  department: string | null;
  status: string;
  evaluations: { score: number }[];
  poEmployee: {
    id: string;
    lastSyncedAt: Date;
    isActive: boolean;
    department?: string | null;
  } | null;
  recmanCandidate: {
    id: string;
    lastSyncedAt: Date;
    isEmployee: boolean;
    title?: string | null;
    imageUrl?: string | null;
  } | null;
}

interface PersonnelListProps {
  personnel: PersonnelWithEvals[];
}

export function PersonnelList({ personnel }: PersonnelListProps) {
  if (personnel.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          Ingen personell funnet. Opprett det første personellet for å komme i
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
              Avdeling
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Synk
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Snitt-score
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Evalueringer
            </th>
          </tr>
        </thead>
        <tbody>
          {personnel.map((person) => {
            const avgScore =
              person.evaluations.length > 0
                ? Math.round(
                    person.evaluations.reduce((sum, e) => sum + e.score, 0) /
                      person.evaluations.length
                  )
                : null;

            // Use department from PO if available, then Personnel
            const department =
              person.department ||
              person.poEmployee?.department ||
              null;

            return (
              <tr
                key={person.id}
                className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/personell/${person.id}`}
                    className="flex items-center gap-3 group"
                  >
                    {person.recmanCandidate?.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={person.recmanCandidate.imageUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {person.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                    )}
                    <span className="font-medium group-hover:underline">
                      {person.name}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {person.recmanCandidate?.title || person.role}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {department ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {person.poEmployee && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0"
                      >
                        PO
                      </Badge>
                    )}
                    {person.recmanCandidate && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0"
                      >
                        Recman
                      </Badge>
                    )}
                    {!person.poEmployee && !person.recmanCandidate && (
                      <span className="text-xs text-muted-foreground/50">
                        —
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {avgScore !== null ? (
                    <ScoreBadge score={avgScore} />
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">
                    {person.evaluations.length}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
