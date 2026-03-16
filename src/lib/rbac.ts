import { auth } from "@/lib/auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  // Check by email
  if (session.user.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    return true;
  }

  // Check by Azure AD group
  const adminGroupId = process.env.ADMIN_GROUP_ID;
  if (adminGroupId && session.user.groups?.includes(adminGroupId)) {
    return true;
  }

  return false;
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
