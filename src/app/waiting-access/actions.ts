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
 *
 * Vi pakker `findFirst` + `create` i én `$transaction`. På READ COMMITTED
 * (Prismas default for Postgres) er dette godt nok for det lave volumet vi
 * forventer på denne siden — to parallelle forespørsler kan i teorien fortsatt
 * begge se ingen rad og begge opprette, men vinduet er svært smalt og UI-en
 * tar likevel imot overgangen. Hvis vi ønsker absolutt garanti kan vi senere
 * legge til en partial unique index på (email, status) WHERE status = 'PENDING'
 * (krever rå SQL — bevisst utsatt).
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

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.accessRequest.findFirst({
      where: { email, status: "PENDING" },
      select: { id: true },
    });
    if (existing) {
      return { alreadyExists: true as const };
    }

    await tx.accessRequest.create({
      data: {
        email,
        entraId,
        displayName,
        requestedLevel: "USER",
        reason: reason?.trim() || null,
        status: "PENDING",
      },
    });

    return { alreadyExists: false as const };
  });

  revalidatePath("/waiting-access");
  return { ok: true, alreadyExists: result.alreadyExists };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
