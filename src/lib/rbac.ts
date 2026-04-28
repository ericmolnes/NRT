import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import {
  getCurrentAccess,
  type CurrentAccess,
} from "@/lib/access/get-current-access";

/**
 * Sjekker om innlogget bruker har ADMIN-tilgang.
 *
 * Bruker den nye tilgangsmodellen (UserAccess) som primær kilde, med
 * ADMIN_EMAILS / ADMIN_GROUP_ID som bootstrap for nye brukere uten rad.
 */
export async function isAdmin(): Promise<boolean> {
  const access = await getCurrentAccess();
  return access.level === "ADMIN";
}

/**
 * Sjekker om innlogget bruker har minst USER-tilgang (USER eller ADMIN).
 * Brukere med MINIMUM-tilgang (eller uautentiserte) returnerer false.
 */
export async function isUser(): Promise<boolean> {
  const access = await getCurrentAccess();
  return access.level === "USER" || access.level === "ADMIN";
}

export async function hasGroup(groupId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  return session.user.groups?.includes(groupId) ?? false;
}

/**
 * Verify that the current user is the owner of a resource or is an admin.
 * Throws if the user is not authorized.
 */
export async function assertCanModify(resource: {
  createdById: string;
}): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Ikke autentisert");
  }
  if (await isAdmin()) return;
  if (resource.createdById !== session.user.id) {
    throw new Error("Ikke autorisert");
  }
}

/**
 * Verify that the current user is an admin. Throws if not.
 */
export async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Ikke autorisert");
  }
}

/**
 * Verify that the current user has at least USER access. Throws if MINIMUM
 * or unauthenticated. Brukes av server actions og sider som ikke skal
 * være tilgjengelige før admin har gitt tilgang.
 */
export async function assertUser(): Promise<void> {
  if (!(await isUser())) {
    throw new Error("Ikke autorisert");
  }
}

// ─── Diskriminert union for API-ruter ───────────────────────────
//
// API-ruter trenger både sesjon og tilgang i samme sjekk. Tidligere kalte vi
// `auth()` og deretter `isUser()` (som internt kaller `auth()` igjen) — to
// runde-turer per request. `requireUser`/`requireAdmin` gjør én `auth()`,
// kombinerer den med tilgangsoppløsningen og returnerer en discriminated
// union som ruta kan switche på.

export type RequiredAccessResult =
  | { ok: true; session: Session; access: CurrentAccess }
  | { ok: false; status: 401 | 403; reason: string };

async function requireLevel(
  minimum: "USER" | "ADMIN"
): Promise<RequiredAccessResult> {
  const session = (await auth()) as Session | null;
  if (!session?.user) {
    return { ok: false, status: 401, reason: "Ikke autentisert" };
  }

  // `getCurrentAccess` bruker short-circuit på den berikede sesjonen vi nettopp
  // hentet, så dette er null-cost i praksis (ingen ny `auth()`, ingen ny DB-tur).
  const access = await getCurrentAccess();

  const allowed =
    minimum === "ADMIN"
      ? access.level === "ADMIN"
      : access.level === "USER" || access.level === "ADMIN";

  if (!allowed) {
    return { ok: false, status: 403, reason: "Ikke autorisert" };
  }

  return { ok: true, session, access };
}

/**
 * Krever minst USER-tilgang (USER eller ADMIN). Returnerer en discriminated
 * union som API-ruter kan switche på:
 *
 *     const r = await requireUser();
 *     if (!r.ok) return NextResponse.json({ error: r.reason }, { status: r.status });
 *     const { session, access } = r;
 */
export async function requireUser(): Promise<RequiredAccessResult> {
  return requireLevel("USER");
}

/**
 * Krever ADMIN-tilgang. Samme retur-format som `requireUser`.
 */
export async function requireAdmin(): Promise<RequiredAccessResult> {
  return requireLevel("ADMIN");
}
