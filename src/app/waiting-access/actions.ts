"use server";

// Server actions for venteside-flyten. En bruker med MINIMUM-tilgang kan
// be om oppgradering. Vi avduplikerer på e-post + status=PENDING slik at
// gjentatte besøk på siden ikke produserer flere forespørsler.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/create-notification";
import { sendAccessRequestEmail } from "@/lib/notifications/send-access-request-email";
import type { NotificationClient } from "@/lib/notifications/types";

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
 *
 * **Varsling:** Når vi faktisk oppretter en ny rad lager vi også en
 * SystemNotification rettet mot ADMIN-nivå (atomisk i samme transaksjon —
 * billig skriving, og vi vil ikke at admin går glipp av en forespørsel
 * fordi varslet feilet). E-postvarslet sendes ETTER transaksjonen, slik
 * at en treg eller feilende SMTP-server ikke kan rulle tilbake selve
 * forespørselen. Helperen `sendAccessRequestEmail` er "fail open" — den
 * kaster aldri, så belt-and-suspenders `.catch` er bare for sikkerhets
 * skyld i tilfelle vi senere endrer kontrakten.
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

    const created = await tx.accessRequest.create({
      data: {
        email,
        entraId,
        displayName,
        requestedLevel: "USER",
        reason: reason?.trim() || null,
        status: "PENDING",
      },
      select: { id: true },
    });

    // Atomisk: hvis varslet feiler (mest sannsynlig en DB-feil siden vi
    // ikke gjør noen nettverkskall her), vil hele transaksjonen rulles
    // tilbake og vi etterlater ikke en stille forespørsel uten varsel.
    await createNotification(tx as unknown as NotificationClient, {
      kind: "ACCESS_REQUEST",
      severity: "INFO",
      title: `Ny tilgangsforespørsel fra ${displayName ?? email}`,
      body: email,
      payload: { requestId: created.id, email, name: displayName },
      targetLevel: "ADMIN",
    });

    return { alreadyExists: false as const, requestId: created.id };
  });

  // E-post sendes ETTER transaksjonen: en treg SMTP-server skal aldri
  // forsinke eller rulle tilbake selve forespørselen. Helperen er "fail
  // open" og returnerer { skipped } istedenfor å kaste, men vi pakker
  // likevel inn en defensiv catch i tilfelle kontrakten endres senere.
  if (!result.alreadyExists) {
    await sendAccessRequestEmail({
      userName: displayName ?? email,
      userEmail: email,
    }).catch((err) => {
      console.error(
        "[notifications] uventet feil fra sendAccessRequestEmail:",
        err
      );
    });
  }

  revalidatePath("/waiting-access");
  return { ok: true, alreadyExists: result.alreadyExists };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
