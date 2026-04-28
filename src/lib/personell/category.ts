// Kategoriberegning for personelldomenet.
//
// Personell, kandidater og innleide deler samme datamodell — kategorien er
// utledet fra eksisterende felter (`RecmanCandidate.isEmployee`,
// `RecmanCandidate.isContractor`, åpen `ContractorPeriod`) i stedet for å
// være en eksplisitt enum-kolonne. Denne modulen samler all logikken på ett
// sted slik at queries, UI og server actions stemmer overens.
//
// Reglene (i prioritert rekkefølge):
//   1. ANSATT  — RecmanCandidate.isEmployee = true OG (employeeEnd er null
//                ELLER employeeEnd er i fremtiden). Identifiseres alltid fra
//                RecMan-employee-data og kan ikke overstyres manuelt.
//   2. INNLEID — Markert som innleid (`isContractor`) ELLER har en åpen
//                `ContractorPeriod` ELLER er en manuelt opprettet
//                Personnel-rad uten RecmanCandidate.
//   3. KANDIDAT — Har en RecmanCandidate-rad, men er verken ansatt eller
//                innleid. Tidligere ansatte (med `employeeEnd` i fortiden)
//                havner her hvis de ikke er aktive innleide.
//   4. INNLEID (fallback) — Edge case: ingen kobling i det hele tatt. Vi
//                lar den havne som INNLEID siden det er den eneste manuelle
//                kategorien som kan eksistere uten RecMan-data.

export type PersonnelCategory = "ANSATT" | "INNLEID" | "KANDIDAT";

/**
 * Innput til `resolveCategory`. `recmanCandidate` er null når personen ikke
 * er koblet til RecMan (typisk manuelt opprettede innleide). `now` er
 * valgfri — settes for å gjøre testene deterministiske.
 */
export type CategoryInput = {
  recmanCandidate: {
    isEmployee: boolean;
    employeeEnd: Date | null;
    isContractor: boolean;
  } | null;
  hasOpenContractorPeriod: boolean;
  /** True når en Personnel-rad eksisterer uten tilkoblet RecmanCandidate. */
  isManualPersonnel: boolean;
  /** Brukes til å avgjøre om `employeeEnd` er passert. Default: ny Date(). */
  now?: Date;
};

/**
 * Avgjør kategorien til en person basert på datagrunnlaget. Ren funksjon —
 * eksportert slik at UI, queries og tester kan bruke samme regel.
 */
export function resolveCategory(input: CategoryInput): PersonnelCategory {
  const now = input.now ?? new Date();
  const rc = input.recmanCandidate;

  // 1. ANSATT trumfer alt annet — ansatt-data fra RecMan er autoritativ.
  if (rc?.isEmployee) {
    const ended = rc.employeeEnd !== null && rc.employeeEnd.getTime() <= now.getTime();
    if (!ended) {
      return "ANSATT";
    }
    // Ansettelsen er avsluttet → fortsett til innleid/kandidat-vurdering.
  }

  // 2. INNLEID — eksplisitt flagg, åpen periode, eller manuelt personell.
  if (rc?.isContractor) return "INNLEID";
  if (input.hasOpenContractorPeriod) return "INNLEID";
  if (input.isManualPersonnel && !rc) return "INNLEID";

  // 3. KANDIDAT — har RecmanCandidate, men er verken ansatt eller innleid.
  if (rc) return "KANDIDAT";

  // 4. Edge: ingen kobling → fall tilbake til manuell innleid.
  return "INNLEID";
}

// ─── Prisma-where for kategori-filtrering ─────────────────────────
//
// Brukes av `getPersonnelList` for å begrense queries til én kategori. Vi
// returnerer en `Prisma.PersonnelWhereInput`-fragment som kalleren kan
// AND-e med øvrige filtre.

/**
 * Bygger en Prisma-where-fragment som filtrerer Personnel-rader til den
 * gitte kategorien. `now` brukes til employeeEnd-sammenligning (default
 * `new Date()`).
 */
export function buildCategoryWhere(
  category: PersonnelCategory,
  now: Date = new Date()
): Record<string, unknown> {
  if (category === "ANSATT") {
    return {
      recmanCandidate: {
        is: {
          isEmployee: true,
          OR: [{ employeeEnd: null }, { employeeEnd: { gt: now } }],
        },
      },
    };
  }

  if (category === "KANDIDAT") {
    return {
      recmanCandidate: {
        is: {
          // Ikke aktiv ansatt: enten ikke markert som ansatt, eller ansettelsen er avsluttet.
          OR: [
            { isEmployee: false },
            { AND: [{ isEmployee: true }, { employeeEnd: { lte: now } }] },
          ],
          // Ikke innleid via flagg.
          isContractor: false,
          // Og ingen åpen periode.
          contractorPeriods: { none: { endDate: null } },
        },
      },
    };
  }

  // INNLEID — to forskjellige veier, derfor OR på top-level:
  //   a) RecmanCandidate med isContractor=true ELLER åpen periode
  //      (men ikke aktiv ansatt — ANSATT trumfer)
  //   b) Personnel uten RecmanCandidate (manuelt opprettet innleid)
  return {
    OR: [
      {
        recmanCandidate: {
          is: {
            // Ikke aktiv ansatt.
            OR: [
              { isEmployee: false },
              { AND: [{ isEmployee: true }, { employeeEnd: { lte: now } }] },
            ],
            // Enten markert som innleid eller har åpen periode.
            AND: [
              {
                OR: [
                  { isContractor: true },
                  { contractorPeriods: { some: { endDate: null } } },
                ],
              },
            ],
          },
        },
      },
      {
        // Manuelt opprettet Personnel uten RecMan-kobling.
        recmanCandidate: { is: null },
      },
    ],
  };
}
