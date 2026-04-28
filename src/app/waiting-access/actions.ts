"use server";

// Server actions for venteside-flyten. En bruker med MINIMUM-tilgang kan
// be om oppgradering. Vi avduplikerer på e-post + status=PENDING slik at
// gjentatte besøk på siden ikke produserer flere forespørsler.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Opprett en tilgangsforespørsel for innlogget bruker hvis det ikke
 * allerede finnes en åpen (PENDING) forespørsel. Idempotent.
 */
export async function requestAccess(reason?: string): Promise<{
  ok: boolean;
  alreadyExists?: boolean;
}> {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Ikke autentisert");
  }

  const email = session.user.email;
  const entraId = session.user.id ?? null;
  const displayName = session.user.name ?? null;

  // Idempotent: hopp over hvis bruker allerede har en åpen forespørsel.
  const existing = await db.accessRequest.findFirst({
    where: { email, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, alreadyExists: true };
  }

  await db.accessRequest.create({
    data: {
      email,
      entraId,
      displayName,
      requestedLevel: "USER",
      reason: reason?.trim() || null,
      status: "PENDING",
    },
  });

  revalidatePath("/waiting-access");
  return { ok: true, alreadyExists: false };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
