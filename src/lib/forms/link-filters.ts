// Filtertolkning for skjema-/evalueringslenker.
//
// `EvaluationLink` skal kunne begrenses til et utvalg kategorier (ANSATT,
// INNLEID, KANDIDAT) og avdelinger. Mottakeren av lenken skal kun se og kunne
// velge personer som matcher disse filtrene. Denne modulen er delt mellom
// server-actions (validering ved innsending), UI (forhåndsvisning av filter)
// og spørrings-laget (henting av filtrert personliste).
//
// Vi støtter også bakoverkompatibilitet med det gamle `roleFilter` (string
// "Ansatt" / "Innleid"). Hvis `categoriesFilter` er null, faller vi tilbake
// til å mappe `roleFilter` over til en kategori-liste. Når `categoriesFilter`
// er satt eksplisitt, ignoreres `roleFilter`.
//
// Reglene for `isPersonAllowed`:
//   1. `personnelIds` er en hard person-lås. Hvis satt, må personens id være
//      med i listen — ALLE andre filtre overstyres.
//   2. Ellers AND-er vi `categories` og `departments`. Null betyr "ingen
//      begrensning" på det aksen.

import type { PersonnelCategory } from "@/lib/personell/category";

// ─── Typer ───────────────────────────────────────────────────────

/**
 * Strukturert representasjon av filtrene på en `EvaluationLink`. Alle felt er
 * nullable; null betyr "ingen begrensning". Tomme arrays normaliseres til
 * null av `parseLinkFilters` slik at både UI og server tolker dem likt.
 */
export type LinkFilters = {
  categories: PersonnelCategory[] | null;
  departments: string[] | null;
  personnelIds: string[] | null;
};

/**
 * Råinput fra DB-raden — alle JSON-feltene kommer ut som `unknown`. Vi tar
 * også med legacy `roleFilter` slik at gamle lenker fortsetter å fungere.
 */
export type LinkFiltersInput = {
  categoriesFilter: unknown;
  departmentsFilter: unknown;
  personnelIds: unknown;
  roleFilter: string | null;
};

/** Person-shape som `isPersonAllowed` opererer på. */
export type PersonForFilter = {
  id: string;
  category: PersonnelCategory;
  department: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────

const VALID_CATEGORIES: ReadonlySet<PersonnelCategory> = new Set([
  "ANSATT",
  "INNLEID",
  "KANDIDAT",
]);

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const cleaned = value.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
  return cleaned.length > 0 ? cleaned : null;
}

function parseCategoryArray(value: unknown): PersonnelCategory[] | null {
  if (!Array.isArray(value)) return null;
  const cleaned = value.filter((item): item is PersonnelCategory =>
    typeof item === "string" && VALID_CATEGORIES.has(item as PersonnelCategory)
  );
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Mapper det gamle `roleFilter`-feltet til den nye `categories`-formen. Brukes
 * kun som fallback når `categoriesFilter` ikke er satt.
 */
function legacyRoleFilterToCategories(
  roleFilter: string | null
): PersonnelCategory[] | null {
  if (!roleFilter) return null;
  if (roleFilter === "Ansatt") return ["ANSATT"];
  if (roleFilter === "Innleid") return ["INNLEID"];
  // Ukjent verdi — vi tolker ikke; lar lenken være åpen i stedet for å lage
  // en falsk begrensning.
  return null;
}

// ─── parseLinkFilters ────────────────────────────────────────────

/**
 * Tolker en EvaluationLink-rad til strukturert filterform. Nullhåndtering:
 *   - `null` på et felt = ingen begrensning på den aksen.
 *   - Tom array = ingen begrensning (normaliseres til null).
 *   - Ugyldige verdier i array filtreres bort.
 */
export function parseLinkFilters(input: LinkFiltersInput): LinkFilters {
  const explicitCategories = parseCategoryArray(input.categoriesFilter);
  const fallbackCategories = explicitCategories
    ? null
    : legacyRoleFilterToCategories(input.roleFilter);

  return {
    categories: explicitCategories ?? fallbackCategories,
    departments: parseStringArray(input.departmentsFilter),
    personnelIds: parseStringArray(input.personnelIds),
  };
}

// ─── isPersonAllowed ─────────────────────────────────────────────

/**
 * Avgjør om en person matcher filtrene på en lenke. `personnelIds` overstyrer
 * de øvrige filtrene; ellers AND-er vi `categories` og `departments`.
 */
export function isPersonAllowed(
  person: PersonForFilter,
  filters: LinkFilters
): boolean {
  // Hard person-lås har forrang.
  if (filters.personnelIds) {
    return filters.personnelIds.includes(person.id);
  }

  if (filters.categories && !filters.categories.includes(person.category)) {
    return false;
  }

  if (filters.departments) {
    if (!person.department) return false;
    if (!filters.departments.includes(person.department)) return false;
  }

  return true;
}

// ─── toPersonnelListFilters ──────────────────────────────────────

/**
 * Returnerer en filter-blob som kan sendes til `getPersonnelishList` for å
 * begrense kandidatlisten i UI til de samme filtrene som server-validering
 * bruker. Vi eksporterer både `department` (scalar — kun når filteret har
 * akkurat én avdeling) og `departments` (array — for kallere som kan filtere
 * lokalt på listen) slik at både den enkle og den utvidede flyten støttes.
 */
export function toPersonnelListFilters(filters: LinkFilters): {
  category?: PersonnelCategory[];
  department?: string;
  departments?: string[];
} {
  const out: { category?: PersonnelCategory[]; department?: string; departments?: string[] } = {};

  if (filters.categories) {
    out.category = filters.categories;
  }

  if (filters.departments) {
    if (filters.departments.length === 1) {
      out.department = filters.departments[0];
    } else {
      out.departments = filters.departments;
    }
  }

  return out;
}
