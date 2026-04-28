import { auth } from "@/lib/auth";
import { getCurrentAccess } from "@/lib/access/get-current-access";

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
