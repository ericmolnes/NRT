// Tilgangsoppløsning: avgjør hvilket nivå (MINIMUM | USER | ADMIN) en bruker har.
//
// Vi har to lag:
//   1. `resolveAccessLevel` — ren funksjon. Tar inn data eksplisitt slik at vi
//      kan enhetsteste reglene uten DB. Dette er reglene fra Task 2:
//        a) Hvis det finnes en UserAccess-rad: bruk dens level. Den er autoritativ.
//        b) Ellers: hvis e-post matcher ADMIN_EMAILS → bootstrap til ADMIN.
//        c) Ellers: hvis gruppe-id matcher ADMIN_GROUP_ID → bootstrap til ADMIN.
//        d) Ellers: MINIMUM (fallback).
//   2. `getCurrentAccess` — produksjons-wrapperen. Henter session + slår opp
//      UserAccess-raden i databasen, og kaller den rene funksjonen.
//
// Vi kjører oppslaget på hver request for nå. Det er enkleste korrekte modell
// og betyr at en admin-godkjenning slår igjennom umiddelbart. Hvis trafikk-
// volum krever det, kan vi senere flytte til JWT-cache i `jwt`-callbacken
// — men da må vi finne en strategi for å invalidere ved tilgangsendringer.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type AccessLevel = "MINIMUM" | "USER" | "ADMIN";

export type AccessSource =
  | "DATABASE"
  | "BOOTSTRAP_EMAIL"
  | "BOOTSTRAP_GROUP"
  | "FALLBACK";

export type CurrentAccess = {
  level: AccessLevel;
  /** Id på UserAccess-raden, hvis brukeren har en. `null` for bootstrap/fallback. */
  userAccessId: string | null;
  source: AccessSource;
};

export type ResolveAccessInput = {
  userAccessRow: { id: string; level: AccessLevel } | null;
  email: string | null;
  groups: string[];
  bootstrapEmails: string[];
  bootstrapGroupId: string | null;
};

/**
 * Ren regel-funksjon. Eksportert for testing og gjenbruk uten DB.
 *
 * Reglene er strenge: så snart en UserAccess-rad finnes, er den autoritativ.
 * Det betyr at bootstrap-mekanismen kun gjelder for nye brukere som ennå
 * ikke har fått en rad. Dette gjør det mulig for en admin å nedgradere seg
 * selv (eller en annen bootstrap-admin) — uten det ville ADMIN_EMAILS gjort
 * det umulig å miste tilgang.
 */
export function resolveAccessLevel(input: ResolveAccessInput): CurrentAccess {
  // 1. Database har forrang. En rad er alltid autoritativ.
  if (input.userAccessRow) {
    return {
      level: input.userAccessRow.level,
      userAccessId: input.userAccessRow.id,
      source: "DATABASE",
    };
  }

  // 2. Bootstrap via e-post — case-insensitive.
  if (input.email) {
    const emailLower = input.email.toLowerCase();
    const matches = input.bootstrapEmails.some(
      (b) => b.trim().toLowerCase() === emailLower
    );
    if (matches) {
      return { level: "ADMIN", userAccessId: null, source: "BOOTSTRAP_EMAIL" };
    }
  }

  // 3. Bootstrap via Entra-gruppe.
  if (input.bootstrapGroupId && input.bootstrapGroupId.length > 0) {
    if (input.groups.includes(input.bootstrapGroupId)) {
      return { level: "ADMIN", userAccessId: null, source: "BOOTSTRAP_GROUP" };
    }
  }

  // 4. Fallback — minimum tilgang.
  return { level: "MINIMUM", userAccessId: null, source: "FALLBACK" };
}

// ─── Konfig-helpere ─────────────────────────────────────────────

function getBootstrapEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

function getBootstrapGroupId(): string | null {
  const v = process.env.ADMIN_GROUP_ID?.trim();
  return v && v.length > 0 ? v : null;
}

// ─── Produksjons-wrapper ────────────────────────────────────────

/**
 * Slår opp aktuell brukers tilgangsnivå. Kombinerer session-data med
 * UserAccess-raden (matchet på entraId først, deretter e-post). For en
 * uautentisert request returnerer vi MINIMUM/FALLBACK — kalleren må selv
 * sjekke at det er en sesjon før den stoler på resultatet.
 */
export async function getCurrentAccess(): Promise<CurrentAccess> {
  const session = await auth();
  if (!session?.user) {
    return { level: "MINIMUM", userAccessId: null, source: "FALLBACK" };
  }

  const entraId = session.user.id ?? null;
  const email = session.user.email ?? null;
  const groups = session.user.groups ?? [];

  // Slå opp UserAccess. Primært på entraId, fallback til e-post for
  // brukere som ennå ikke har en entraId-knytning.
  const row = await findUserAccessRow({ entraId, email });

  return resolveAccessLevel({
    userAccessRow: row,
    email,
    groups,
    bootstrapEmails: getBootstrapEmails(),
    bootstrapGroupId: getBootstrapGroupId(),
  });
}

async function findUserAccessRow(input: {
  entraId: string | null;
  email: string | null;
}): Promise<{ id: string; level: AccessLevel } | null> {
  if (!input.entraId && !input.email) return null;

  // Bygg `OR`-betingelser dynamisk slik at vi ikke matcher null-felter.
  const orFilters: Array<{ entraId?: string; email?: string }> = [];
  if (input.entraId) orFilters.push({ entraId: input.entraId });
  if (input.email) orFilters.push({ email: input.email });

  const row = await db.userAccess.findFirst({
    where: { OR: orFilters },
    select: { id: true, level: true },
  });

  return row;
}
