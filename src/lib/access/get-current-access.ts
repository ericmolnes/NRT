// Tilgangsoppløsning: avgjør hvilket nivå (MINIMUM | USER | ADMIN) en bruker har.
//
// Vi har tre lag:
//   1. `resolveAccessLevel` — ren funksjon. Tar inn data eksplisitt slik at vi
//      kan enhetsteste reglene uten DB. Dette er reglene fra Task 2:
//        a) Hvis det finnes en UserAccess-rad: bruk dens level. Den er autoritativ.
//        b) Ellers: hvis e-post matcher ADMIN_EMAILS → bootstrap til ADMIN.
//        c) Ellers: hvis gruppe-id matcher ADMIN_GROUP_ID → bootstrap til ADMIN.
//        d) Ellers: MINIMUM (fallback).
//   2. `resolveAccessForSession` — kombinerer DB-oppslag (UserAccess) med den rene
//      regelfunksjonen. Tar valgfri `db`-klient slik at den kan testes med stub.
//      Dette er det eneste stedet som faktisk gjør DB-oppslag for tilgang.
//   3. `getCurrentAccess` — produksjons-wrapperen som henter sesjonen og kaller
//      `resolveAccessForSession`. Inneholder en short-circuit som unngår dobbelt
//      DB-oppslag når sesjonen allerede er beriket av session-callbacken.
//
// Vi kjører oppslaget på hver request for nye sesjoner. Det er enkleste korrekte
// modell og betyr at en admin-godkjenning slår igjennom ved neste session-fetch.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type AccessLevel = "MINIMUM" | "USER" | "ADMIN";

export type AccessSource =
  | "DATABASE"
  | "BOOTSTRAP_EMAIL"
  | "BOOTSTRAP_GROUP"
  | "FALLBACK"
  | "SESSION_CACHE";

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

// ─── DB-helpere ─────────────────────────────────────────────────

/**
 * Minimalt klient-grensesnitt for DB-oppslag av UserAccess-rader.
 * Eksportert som type slik at testene kan injisere en in-memory stub uten
 * å dra inn full Prisma-klient.
 */
export type AccessDbClient = {
  userAccess: {
    findFirst(args: {
      where: { OR: Array<{ entraId?: string; email?: string }> };
      select: { id: true; level: true };
    }): Promise<{ id: string; level: AccessLevel } | null>;
  };
};

/**
 * Slår opp en UserAccess-rad på `entraId` og/eller e-post. Bygger OR-filteret
 * dynamisk slik at vi ikke matcher null-verdier. Returnerer `null` hvis ingen
 * av identifikatorene er satt eller ingen rad finnes.
 */
export async function findUserAccessRow(
  client: AccessDbClient,
  input: { entraId: string | null | undefined; email: string | null | undefined }
): Promise<{ id: string; level: AccessLevel } | null> {
  if (!input.entraId && !input.email) return null;

  const orFilters: Array<{ entraId?: string; email?: string }> = [];
  if (input.entraId) orFilters.push({ entraId: input.entraId });
  if (input.email) orFilters.push({ email: input.email });

  const row = await client.userAccess.findFirst({
    where: { OR: orFilters },
    select: { id: true, level: true },
  });

  return row;
}

// ─── Delt resolver: DB + ren regel ──────────────────────────────

export type ResolveForSessionInput = {
  entraId: string | null | undefined;
  email: string | null | undefined;
  groups: string[] | null | undefined;
};

/**
 * Slår opp UserAccess-raden i databasen og kombinerer den med den rene
 * regelfunksjonen. Brukes både av session-callbacken i `auth.ts` og av
 * `getCurrentAccess`. Tar valgfri `db`-klient slik at testene kan injisere
 * en in-memory stub.
 *
 * Bootstrap-listene leses fra miljøvariabler (`ADMIN_EMAILS`, `ADMIN_GROUP_ID`)
 * akkurat som før — men hele DB+bootstrap-flyten finnes nå på ett sted.
 */
export async function resolveAccessForSession(
  input: ResolveForSessionInput,
  client: AccessDbClient = db as unknown as AccessDbClient
): Promise<CurrentAccess> {
  const row = await findUserAccessRow(client, {
    entraId: input.entraId ?? null,
    email: input.email ?? null,
  });

  return resolveAccessLevel({
    userAccessRow: row,
    email: input.email ?? null,
    groups: input.groups ?? [],
    bootstrapEmails: getBootstrapEmails(),
    bootstrapGroupId: getBootstrapGroupId(),
  });
}

// ─── Sesjonsformet input for short-circuit ──────────────────────

/**
 * Minimalt session.user-grensesnitt som `resolveAccessForUser` jobber mot.
 * Vi tar inn akkurat de feltene vi trenger slik at testene kan stuppe en
 * vanlig POJO uten å dra inn next-auth typer.
 */
export type SessionUserShape = {
  id?: string | null;
  email?: string | null;
  groups?: string[] | null;
  accessLevel?: AccessLevel;
  userAccessId?: string | null;
};

/**
 * Returnerer `CurrentAccess` for en gitt session.user. Bruker short-circuit
 * når `accessLevel` allerede er beriket — i så fall slipper vi et DB-oppslag
 * helt. Eksportert separat fra `getCurrentAccess` slik at vi kan enhetsteste
 * short-circuit-stien uten å mocke `auth()` på modul-nivå.
 */
export async function resolveAccessForUser(
  user: SessionUserShape | null | undefined,
  client: AccessDbClient = db as unknown as AccessDbClient
): Promise<CurrentAccess> {
  if (!user) {
    return { level: "MINIMUM", userAccessId: null, source: "FALLBACK" };
  }

  // Short-circuit: session-callbacken har allerede gjort jobben. Vi stoler
  // på de berikede feltene og unngår et redundant DB-treff. Bootstrap-admin
  // kan ha `accessLevel: "ADMIN"` med `userAccessId: null` — det er fortsatt
  // korrekt å returnere direkte.
  if (
    user.accessLevel &&
    Object.prototype.hasOwnProperty.call(user, "userAccessId")
  ) {
    return {
      level: user.accessLevel,
      userAccessId: user.userAccessId ?? null,
      source: "SESSION_CACHE",
    };
  }

  return resolveAccessForSession(
    {
      entraId: user.id ?? null,
      email: user.email ?? null,
      groups: user.groups ?? [],
    },
    client
  );
}

// ─── Produksjons-wrapper ────────────────────────────────────────

/**
 * Slår opp aktuell brukers tilgangsnivå. Kombinerer session-data med
 * UserAccess-raden (matchet på entraId først, deretter e-post). For en
 * uautentisert request returnerer vi MINIMUM/FALLBACK — kalleren må selv
 * sjekke at det er en sesjon før den stoler på resultatet.
 *
 * Short-circuit: Hvis sesjonen allerede er beriket med `accessLevel`
 * (typisk fordi `auth()` allerede er kalt og session-callbacken har kjørt),
 * unngår vi et nytt DB-oppslag og returnerer det cachede resultatet.
 */
export async function getCurrentAccess(): Promise<CurrentAccess> {
  const session = await auth();
  return resolveAccessForUser(session?.user ?? null);
}
