// Samlet listevisning for personellet — ANSATT, INNLEID og KANDIDAT.
//
// Denne modulen er den felles datakilden for tre sider:
//   - /personell           (ansatte)
//   - /personell/innleide  (innleide)
//   - /personell/kandidater (kandidater)
//
// Tidligere brukte hver side en separat query (`getPersonnelList`,
// `searchCandidates`, `searchContractors`) som ga ulik dataform — det gjorde
// det vanskelig å dele filter-/profil-komponenter. Vi løser det med én
// `PersonnelishRow`-form som dekker alle tre kategoriene.
//
// Et reelt problem: mange `RecmanCandidate`-rader har ingen `Personnel`-rad
// fordi kandidatpoolen historisk har vært "alle kandidater filtrert til
// ikke-ansatte". Vi kan derfor ikke bare slå opp `Personnel`. Løsningen er en
// to-fase spørring:
//   1. Hent `Personnel`-rader (med recmanCandidate, evalueringer, perioder)
//      som matcher kategorien.
//   2. Hvis kategorien er KANDIDAT eller INNLEID, hent også
//      `RecmanCandidate`-rader uten `Personnel`-kobling som matcher
//      kategorien (de "kandidat-only"-radene).
//   3. Slå sammen til én liste med felles form og sorter på navn.
//
// `id`-feltet er stabilt på tvers av rendere: `Personnel.id` for koblede
// rader, `rc:<RecmanCandidate.id>` for kandidat-only-rader. Det gjør det
// trygt å bruke som React-key og som routing-parameter.

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  buildCategoryWhere,
  resolveCategory,
  type PersonnelCategory,
} from "@/lib/personell/category";
import { SKILL_CATEGORIES } from "@/lib/recman/types";

// ─── Typer ───────────────────────────────────────────────────────

/**
 * RecmanCandidate-fragment som listevisningene konsumerer. Vi tar med alle
 * felter som UI-kompleksitet faktisk bruker — navn, kontakt, tittel, by,
 * rating, status-flagg, bilde, og JSON-feltene (skills/languages/førerkort).
 * Dette er en bevisst superset av det `getPersonnelList` returnerer i dag.
 */
export type PersonnelishRecmanCandidate = {
  id: string;
  recmanId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  city: string | null;
  rating: number;
  imageUrl: string | null;
  isEmployee: boolean;
  employeeNumber: number | null;
  employeeStart: Date | null;
  employeeEnd: Date | null;
  isContractor: boolean;
  skills: unknown;
  languages: unknown;
  driversLicense: unknown;
  lastSyncedAt: Date;
  contractorPeriods: Array<{
    id: string;
    startDate: Date;
    endDate: Date | null;
    company: string | null;
    notes: string | null;
  }>;
};

export type PersonnelishPOEmployee = {
  id: string;
  lastSyncedAt: Date;
  isActive: boolean;
  department: string | null;
};

export type PersonnelishEvaluation = {
  score: number;
  hpiSafety: number;
  competence: number;
  collaboration: number;
  workEthic: number;
  independence: number;
  punctuality: number;
};

/**
 * Felles radform for de tre listevisningene. `source` skiller koblet
 * Personnel fra rene RecmanCandidate-rader. `id` er stabil og kan brukes som
 * React-key.
 */
export type PersonnelishRow = {
  id: string;
  source: "PERSONNEL" | "RECMAN_ONLY";
  personnelId: string | null;
  recmanCandidateId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  category: PersonnelCategory;
  recmanCandidate: PersonnelishRecmanCandidate | null;
  poEmployee: PersonnelishPOEmployee | null;
  evaluations: PersonnelishEvaluation[];
};

// ─── Filter-input ────────────────────────────────────────────────

export type PersonnelishFilters = {
  /** Én eller flere kategorier (AND uten kategori = alle). */
  category?: PersonnelCategory | PersonnelCategory[];
  /** Tekstsøk på navn, e-post, tittel. */
  search?: string;
  /** RecMan-corporation-ID (avdeling). */
  department?: string;
  /** "po" | "recman" | "unlinked" — synk-status. */
  syncStatus?: "po" | "recman" | "unlinked";
  /** Bedrift på en aktiv ContractorPeriod. */
  company?: string;
  /** RecMan-by. */
  city?: string;
  /** Min rating. */
  minRating?: number;
  /** Førerkort-klasse (B, BE, C, CE, D). */
  license?: string;
  /** Språk-navn. */
  language?: string;
  /** Skill-kategori-nøkkel fra `SKILL_CATEGORIES`. */
  skill?: string;
  /** Personell-status (default ACTIVE). */
  status?: string;
  /**
   * Når true (default for KANDIDAT/INNLEID), inkluder også RecmanCandidate-
   * rader uten Personnel-kobling. Settes til false når man vil ha kun
   * Personnel-koblede rader (typisk for ANSATT).
   */
  includeUnpersonneledCandidates?: boolean;
};

// ─── Pure helpers (testes uten DB) ───────────────────────────────

/**
 * Normaliserer en `Personnel`-rad (med inkluderte relasjoner) til
 * `PersonnelishRow`. Beregner `category` med `resolveCategory` slik at
 * UI ikke trenger å avlede den selv.
 */
export function personnelToRow(
  person: PersonnelRowInput,
  now: Date = new Date()
): PersonnelishRow {
  const rc = person.recmanCandidate ?? null;
  const hasOpenPeriod =
    (rc?.contractorPeriods ?? []).some((p) => p.endDate === null) ?? false;
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
    id: person.id,
    source: "PERSONNEL",
    personnelId: person.id,
    recmanCandidateId: rc?.id ?? null,
    name: person.name,
    email: person.email ?? rc?.email ?? null,
    phone: person.phone ?? rc?.phone ?? null,
    role: person.role,
    department: person.department ?? person.poEmployee?.department ?? null,
    category,
    recmanCandidate: rc
      ? {
          id: rc.id,
          recmanId: rc.recmanId,
          firstName: rc.firstName,
          lastName: rc.lastName,
          email: rc.email,
          phone: rc.phone,
          title: rc.title,
          city: rc.city,
          rating: rc.rating,
          imageUrl: rc.imageUrl,
          isEmployee: rc.isEmployee,
          employeeNumber: rc.employeeNumber,
          employeeStart: rc.employeeStart,
          employeeEnd: rc.employeeEnd,
          isContractor: rc.isContractor,
          skills: rc.skills,
          languages: rc.languages,
          driversLicense: rc.driversLicense,
          lastSyncedAt: rc.lastSyncedAt,
          contractorPeriods: rc.contractorPeriods ?? [],
        }
      : null,
    poEmployee: person.poEmployee
      ? {
          id: person.poEmployee.id,
          lastSyncedAt: person.poEmployee.lastSyncedAt,
          isActive: person.poEmployee.isActive,
          department: person.poEmployee.department ?? null,
        }
      : null,
    evaluations: person.evaluations ?? [],
  };
}

/**
 * Normaliserer en RecmanCandidate uten Personnel-kobling til `PersonnelishRow`.
 * `id` får prefiks `rc:` for å unngå kollisjoner med Personnel.id i React-keys.
 */
export function recmanCandidateToRow(
  candidate: RecmanCandidateRowInput,
  now: Date = new Date()
): PersonnelishRow {
  const hasOpenPeriod =
    (candidate.contractorPeriods ?? []).some((p) => p.endDate === null) ??
    false;
  const category = resolveCategory({
    recmanCandidate: {
      isEmployee: candidate.isEmployee,
      employeeEnd: candidate.employeeEnd,
      isContractor: candidate.isContractor,
    },
    hasOpenContractorPeriod: hasOpenPeriod,
    isManualPersonnel: false,
    now,
  });

  return {
    id: `rc:${candidate.id}`,
    source: "RECMAN_ONLY",
    personnelId: null,
    recmanCandidateId: candidate.id,
    name: `${candidate.firstName} ${candidate.lastName}`.trim(),
    email: candidate.email,
    phone: candidate.phone,
    role: candidate.title,
    department: candidate.corporationId ?? null,
    category,
    recmanCandidate: {
      id: candidate.id,
      recmanId: candidate.recmanId,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      title: candidate.title,
      city: candidate.city,
      rating: candidate.rating,
      imageUrl: candidate.imageUrl,
      isEmployee: candidate.isEmployee,
      employeeNumber: candidate.employeeNumber,
      employeeStart: candidate.employeeStart,
      employeeEnd: candidate.employeeEnd,
      isContractor: candidate.isContractor,
      skills: candidate.skills,
      languages: candidate.languages,
      driversLicense: candidate.driversLicense,
      lastSyncedAt: candidate.lastSyncedAt,
      contractorPeriods: candidate.contractorPeriods ?? [],
    },
    poEmployee: null,
    evaluations: [],
  };
}

/**
 * Filtrerer rader på skill-kategori, førerkort og språk i applikasjonskoden.
 * Disse feltene er JSON-blobs i RecmanCandidate; Prisma-filtrering på dem er
 * upålitelig på tvers av postgres-versjoner. Vi gjør det heller her hvor det
 * er forutsigbart og lett å teste.
 */
export function applyJsonPostFilters(
  rows: PersonnelishRow[],
  filters: Pick<PersonnelishFilters, "skill" | "license" | "language">
): PersonnelishRow[] {
  let result = rows;

  if (filters.skill) {
    const categoryKey = filters.skill as keyof typeof SKILL_CATEGORIES;
    const keywords = SKILL_CATEGORIES[categoryKey];
    const searchTerms = keywords ?? [filters.skill.toLowerCase()];
    result = result.filter((row) => {
      const skills = (row.recmanCandidate?.skills as Array<{ name: string }> | null) ?? [];
      return skills.some((s) =>
        searchTerms.some((kw) => s.name.toLowerCase().includes(kw))
      );
    });
  }

  if (filters.license) {
    result = result.filter((row) => {
      const licenses = (row.recmanCandidate?.driversLicense as string[] | null) ?? [];
      return licenses.includes(filters.license!);
    });
  }

  if (filters.language) {
    const lang = filters.language.toLowerCase();
    result = result.filter((row) => {
      const langs = (row.recmanCandidate?.languages as Array<{ name: string }> | null) ?? [];
      return langs.some((l) => l.name.toLowerCase().includes(lang));
    });
  }

  return result;
}

/**
 * Slår sammen Personnel-baserte og RecmanCandidate-baserte rader, fjerner
 * duplikater (RecmanCandidate som allerede er representert via Personnel)
 * og sorterer på navn.
 */
export function mergeRows(
  personnelRows: PersonnelishRow[],
  recmanOnlyRows: PersonnelishRow[]
): PersonnelishRow[] {
  // Fjern duplikater: hvis en RecmanCandidate.id allerede dukker opp via en
  // Personnel-rad, dropp den fra recman-only-listen.
  const linkedRecmanIds = new Set(
    personnelRows
      .map((r) => r.recmanCandidateId)
      .filter((id): id is string => !!id)
  );
  const onlyUnlinked = recmanOnlyRows.filter(
    (r) => r.recmanCandidateId && !linkedRecmanIds.has(r.recmanCandidateId)
  );

  return [...personnelRows, ...onlyUnlinked].sort((a, b) =>
    a.name.localeCompare(b.name, "nb", { sensitivity: "base" })
  );
}

// ─── Hjelpe-typer for `personnelToRow` / `recmanCandidateToRow` ──

export type PersonnelRowInput = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  evaluations: PersonnelishEvaluation[];
  poEmployee: {
    id: string;
    lastSyncedAt: Date;
    isActive: boolean;
    department: string | null;
  } | null;
  recmanCandidate: RecmanCandidateRowInput | null;
};

export type RecmanCandidateRowInput = {
  id: string;
  recmanId: string;
  corporationId?: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  city: string | null;
  rating: number;
  imageUrl: string | null;
  isEmployee: boolean;
  employeeNumber: number | null;
  employeeStart: Date | null;
  employeeEnd: Date | null;
  isContractor: boolean;
  skills: unknown;
  languages: unknown;
  driversLicense: unknown;
  lastSyncedAt: Date;
  contractorPeriods: Array<{
    id: string;
    startDate: Date;
    endDate: Date | null;
    company: string | null;
    notes: string | null;
  }>;
};

// ─── DB-spørringen ───────────────────────────────────────────────

/**
 * Bygger Prisma-where for Personnel-spørringen ut fra filtrene. Logikken er
 * ekvivalent med den i `getPersonnelList`, men utvidet med flere felter
 * (company, city, minRating). Holdes lokalt fordi vi har ulike filtre i
 * recman-spørringen og ikke ønsker dobbelt opp.
 */
function buildPersonnelWhere(
  filters: PersonnelishFilters,
  now: Date
): Prisma.PersonnelWhereInput {
  const ANDs: Prisma.PersonnelWhereInput[] = [];

  if (filters.search) {
    ANDs.push({
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        {
          recmanCandidate: {
            is: {
              OR: [
                { firstName: { contains: filters.search, mode: "insensitive" } },
                { lastName: { contains: filters.search, mode: "insensitive" } },
                { title: { contains: filters.search, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  const recmanFilter: Prisma.RecmanCandidateWhereInput = {};
  let requireRecmanRelation = false;
  let requireUnlinked = false;

  if (filters.department) {
    recmanFilter.corporationId = filters.department;
    requireRecmanRelation = true;
  }

  if (filters.city) {
    recmanFilter.city = { contains: filters.city, mode: "insensitive" };
    requireRecmanRelation = true;
  }

  if (filters.minRating !== undefined) {
    recmanFilter.rating = { gte: filters.minRating };
    requireRecmanRelation = true;
  }

  if (filters.company) {
    recmanFilter.contractorPeriods = {
      some: { company: { contains: filters.company, mode: "insensitive" } },
    };
    requireRecmanRelation = true;
  }

  if (filters.syncStatus === "po") {
    ANDs.push({ poEmployee: { isNot: null } });
  } else if (filters.syncStatus === "recman") {
    requireRecmanRelation = true;
  } else if (filters.syncStatus === "unlinked") {
    ANDs.push({ poEmployee: { is: null } });
    requireUnlinked = true;
  }

  // Kategori-filter: behandler både skalar og array.
  const categories = normalizeCategories(filters.category);
  if (categories) {
    if (requireUnlinked && !categories.includes("INNLEID")) {
      ANDs.push({ id: "__never__" });
    } else if (requireUnlinked) {
      // unlinked + INNLEID: ingen ekstra constraints — allerede dekket.
    } else if (categories.length === 1) {
      ANDs.push(
        buildCategoryWhere(categories[0], now) as Prisma.PersonnelWhereInput
      );
    } else {
      ANDs.push({
        OR: categories.map(
          (c) => buildCategoryWhere(c, now) as Prisma.PersonnelWhereInput
        ),
      });
    }
  }

  if (requireUnlinked) {
    ANDs.push({ recmanCandidate: { is: null } });
  } else if (Object.keys(recmanFilter).length > 0 || requireRecmanRelation) {
    ANDs.push({ recmanCandidate: { is: recmanFilter } });
  }

  const where: Prisma.PersonnelWhereInput = {};
  if (ANDs.length > 0) where.AND = ANDs;

  if (filters.status) {
    where.status = filters.status as Prisma.EnumPersonnelStatusFilter;
  } else {
    where.status = "ACTIVE";
  }

  return where;
}

/**
 * Bygger where for RecmanCandidate-only-spørringen (kandidater uten
 * Personnel-rad). Disse sees kun når kategorien er KANDIDAT eller INNLEID
 * (ANSATT er alltid Personnel-koblet via RecMan-sync).
 */
function buildRecmanOnlyWhere(
  filters: PersonnelishFilters,
  categories: PersonnelCategory[],
  now: Date
): Prisma.RecmanCandidateWhereInput {
  const ANDs: Prisma.RecmanCandidateWhereInput[] = [{ personnelId: null }];

  // Kategori-filter — vi gjenbruker `buildCategoryWhere` ved å peke på
  // RecmanCandidate-relasjonen som "is" og pakke ut.
  if (categories.length === 1) {
    const fragment = buildCategoryWhere(categories[0], now) as {
      recmanCandidate?: { is?: Prisma.RecmanCandidateWhereInput };
      OR?: Array<{
        recmanCandidate?: { is?: Prisma.RecmanCandidateWhereInput | null };
      }>;
    };
    // For ANSATT/KANDIDAT er fragmentet `{recmanCandidate: {is: ...}}`. Vi
    // pakker ut where-biten direkte til RecmanCandidate.
    if (fragment.recmanCandidate?.is) {
      ANDs.push(fragment.recmanCandidate.is);
    } else if (fragment.OR) {
      // INNLEID-fragmentet er en OR — vi henter bare den biten som peker på
      // recmanCandidate (den andre er "ingen recman-kobling", som er
      // irrelevant her siden vi allerede filtrerer på personnelId=null
      // OG eksisterer i recmanCandidate-tabellen).
      const recmanOr = fragment.OR.map((part) => part.recmanCandidate?.is).filter(
        (x): x is Prisma.RecmanCandidateWhereInput => !!x
      );
      if (recmanOr.length > 0) {
        ANDs.push({ OR: recmanOr });
      }
    }
  } else {
    const orParts: Prisma.RecmanCandidateWhereInput[] = [];
    for (const c of categories) {
      const fragment = buildCategoryWhere(c, now) as {
        recmanCandidate?: { is?: Prisma.RecmanCandidateWhereInput };
        OR?: Array<{
          recmanCandidate?: { is?: Prisma.RecmanCandidateWhereInput | null };
        }>;
      };
      if (fragment.recmanCandidate?.is) {
        orParts.push(fragment.recmanCandidate.is);
      } else if (fragment.OR) {
        for (const part of fragment.OR) {
          if (part.recmanCandidate?.is) orParts.push(part.recmanCandidate.is);
        }
      }
    }
    if (orParts.length > 0) ANDs.push({ OR: orParts });
  }

  if (filters.search) {
    ANDs.push({
      OR: [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { title: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }

  if (filters.department) {
    ANDs.push({ corporationId: filters.department });
  }

  if (filters.city) {
    ANDs.push({ city: { contains: filters.city, mode: "insensitive" } });
  }

  if (filters.minRating !== undefined) {
    ANDs.push({ rating: { gte: filters.minRating } });
  }

  if (filters.company) {
    ANDs.push({
      contractorPeriods: {
        some: { company: { contains: filters.company, mode: "insensitive" } },
      },
    });
  }

  return { AND: ANDs };
}

function normalizeCategories(
  category: PersonnelCategory | PersonnelCategory[] | undefined
): PersonnelCategory[] | null {
  if (!category) return null;
  if (Array.isArray(category)) return category.length > 0 ? category : null;
  return [category];
}

/**
 * Hovedfunksjonen: returnerer alle rader som matcher filtrene, normalisert
 * til `PersonnelishRow`. Resultatet er sortert på navn.
 */
export async function getPersonnelishList(
  filters: PersonnelishFilters = {}
): Promise<PersonnelishRow[]> {
  const now = new Date();
  const personnelWhere = buildPersonnelWhere(filters, now);

  const personnelRows = await db.personnel.findMany({
    where: personnelWhere,
    include: {
      evaluations: {
        select: {
          score: true,
          hpiSafety: true,
          competence: true,
          collaboration: true,
          workEthic: true,
          independence: true,
          punctuality: true,
        },
      },
      poEmployee: {
        select: {
          id: true,
          lastSyncedAt: true,
          isActive: true,
          department: true,
        },
      },
      recmanCandidate: {
        include: {
          contractorPeriods: { orderBy: { startDate: "desc" } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const normalizedPersonnel = personnelRows.map((p) =>
    personnelToRow(p as PersonnelRowInput, now)
  );

  // Skal vi ta med RecmanCandidate-rader uten Personnel-kobling?
  const categories = normalizeCategories(filters.category);
  const includeUnpersonneled =
    filters.includeUnpersonneledCandidates ??
    (categories
      ? categories.some((c) => c === "KANDIDAT" || c === "INNLEID")
      : true);

  const wantsUnlinked = filters.syncStatus === "unlinked";
  const wantsPoOnly = filters.syncStatus === "po";

  // RecmanCandidate-rader er per definisjon "recman-koblet" — så hvis
  // syncStatus="unlinked" eller "po", ekskluder dem.
  const shouldQueryRecmanOnly =
    includeUnpersonneled && !wantsUnlinked && !wantsPoOnly;

  let normalizedRecman: PersonnelishRow[] = [];
  if (shouldQueryRecmanOnly) {
    const effectiveCategories: PersonnelCategory[] = categories ?? [
      "KANDIDAT",
      "INNLEID",
    ];
    const recmanWhere = buildRecmanOnlyWhere(filters, effectiveCategories, now);
    const recmanRows = await db.recmanCandidate.findMany({
      where: recmanWhere,
      include: {
        contractorPeriods: { orderBy: { startDate: "desc" } },
      },
    });
    normalizedRecman = recmanRows.map((c) =>
      recmanCandidateToRow(c as RecmanCandidateRowInput, now)
    );
  }

  const merged = mergeRows(normalizedPersonnel, normalizedRecman);
  return applyJsonPostFilters(merged, filters);
}
