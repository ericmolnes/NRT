// Tilgangskontroll for skjema-/evalueringslenker.
//
// Sjekker om en gitt person kan evalueres via en lenke. Bygger på
// `parseLinkFilters` + `isPersonAllowed` fra `link-filters.ts` slik at både
// UI-forhåndsvisning og server-side validering bruker samme regelsett.
// Beholder en tynn input-form (`PersonnelAccessRecord`) som matcher dataene
// vi hentet i `db.personnel.findUnique({ select: ... })` i public actions.

import {
  isPersonAllowed,
  parseLinkFilters,
  type LinkFiltersInput,
} from "./link-filters";
import { resolveCategory } from "@/lib/personell/category";

type FormLinkAccess = LinkFiltersInput & {
  personnelId: string | null;
};

type PersonnelAccessRecord = {
  id: string;
  status: string;
  role: string;
  department: string | null;
  recmanCandidate?: {
    isContractor: boolean;
    isEmployee: boolean;
    employeeEnd: Date | null;
    corporationId: string | null;
    contractorPeriods?: Array<{ endDate: Date | null }>;
  } | null;
};

export function parsePersonnelIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (id): id is string => typeof id === "string" && id.length > 0
  );
}

/**
 * Avgjør effektiv avdeling for en person. Vi foretrekker
 * `recmanCandidate.corporationId` (autoritativ for synced personell), faller
 * tilbake til `Personnel.department` for manuelt opprettede rader.
 */
function resolveDepartment(personnel: PersonnelAccessRecord): string | null {
  return personnel.recmanCandidate?.corporationId ?? personnel.department;
}

export function toPersonForFilter(
  personnel: PersonnelAccessRecord,
  now: Date = new Date()
): {
  id: string;
  category: "ANSATT" | "INNLEID" | "KANDIDAT";
  department: string | null;
} {
  const rc = personnel.recmanCandidate ?? null;
  const hasOpenPeriod =
    rc?.contractorPeriods?.some((p) => p.endDate === null) ?? false;
  const category = resolveCategory({
    recmanCandidate: rc
      ? {
          isEmployee: rc.isEmployee,
          employeeEnd: rc.employeeEnd,
          isContractor: rc.isContractor,
        }
      : null,
    hasOpenContractorPeriod: hasOpenPeriod,
    isManualPersonnel: !rc,
    now,
  });

  return {
    id: personnel.id,
    category,
    department: resolveDepartment(personnel),
  };
}

export function isPersonnelAllowedForFormLink(
  link: FormLinkAccess,
  personnel: PersonnelAccessRecord,
  now: Date = new Date()
): boolean {
  if (personnel.status === "ARCHIVED") return false;

  // Behold den enkle "single person lock" som hovedinngangen — den bypasser
  // alle andre filtre og er en eksplisitt 1:1-mapping.
  if (link.personnelId) {
    return personnel.id === link.personnelId;
  }

  const filters = parseLinkFilters(link);
  return isPersonAllowed(toPersonForFilter(personnel, now), filters);
}
