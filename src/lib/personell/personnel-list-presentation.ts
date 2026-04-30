import type { PersonnelCategory } from "./category";
import type {
  PersonnelishEvaluation,
  PersonnelishPOEmployee,
  PersonnelishRecmanCandidate,
} from "@/lib/queries/personnel-list";

export type PersonnelListPresentationInput = {
  id: string;
  source: "PERSONNEL" | "RECMAN_ONLY";
  personnelId: string | null;
  recmanCandidateId: string | null;
  name: string;
  role: string | null;
  department: string | null;
  category: PersonnelCategory;
  recmanCandidate: PersonnelishRecmanCandidate | null;
  poEmployee: PersonnelishPOEmployee | null;
  evaluations: PersonnelishEvaluation[];
};

function getCategoryLabel(category: PersonnelCategory): string {
  if (category === "ANSATT") return "Ansatt";
  if (category === "INNLEID") return "Innleid";
  return "Kandidat";
}

export function getPersonnelListPresentation(
  row: PersonnelListPresentationInput
): {
  href: string;
  displayRole: string;
  displayDepartment: string;
  categoryLabel: string;
  syncLabels: string[];
} {
  const href =
    row.source === "PERSONNEL" && row.personnelId
      ? `/personell/${row.personnelId}`
      : `/recman/${row.recmanCandidateId ?? row.id}`;

  const displayRole = row.recmanCandidate?.title ?? row.role ?? "-";
  const displayDepartment = row.department ?? "-";
  const syncLabels: string[] = [];

  if (row.poEmployee) syncLabels.push("PO");
  if (row.recmanCandidate) syncLabels.push("Recman");

  return {
    href,
    displayRole,
    displayDepartment,
    categoryLabel: getCategoryLabel(row.category),
    syncLabels,
  };
}
