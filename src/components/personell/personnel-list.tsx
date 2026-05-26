import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/evaluering/score-badge";
import {
  getPersonnelListPresentation,
  type PersonnelListPresentationInput,
} from "@/lib/personell/personnel-list-presentation";
import type { PersonnelishRow } from "@/lib/queries/personnel-list";
import Link from "next/link";

interface PersonnelListProps {
  personnel: PersonnelishRow[];
}

function formatLastSynced(person: PersonnelishRow): string {
  const dates = [
    person.recmanCandidate?.lastSyncedAt ?? null,
    person.poEmployee?.lastSyncedAt ?? null,
  ].filter((date): date is Date => date !== null);

  if (dates.length === 0) return "-";

  const latest = dates.reduce((current, date) =>
    date.getTime() > current.getTime() ? date : current
  );
  return latest.toLocaleDateString("nb-NO");
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
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[920px]">
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
              Sist synket
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Kategori
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

            const view = getPersonnelListPresentation(
              person as PersonnelListPresentationInput
            );
            const categoryClass =
              person.category === "ANSATT"
                ? "bg-emerald-100 text-emerald-700"
                : person.category === "INNLEID"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-muted text-muted-foreground";

            return (
              <tr
                key={person.id}
                className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={view.href}
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
                  {view.displayRole}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {view.displayDepartment}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {view.syncLabels.length > 0 ? (
                      view.syncLabels.map((label) => (
                        <Badge
                          key={label}
                          variant="secondary"
                          className={
                            label === "PO"
                              ? "bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0"
                              : "bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0"
                          }
                        >
                          {label}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground/50">
                        —
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatLastSynced(person)}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${categoryClass}`}
                  >
                    {view.categoryLabel}
                  </Badge>
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
