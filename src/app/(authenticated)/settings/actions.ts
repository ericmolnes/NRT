"use server";

import { auth } from "@/lib/auth";
import { assertAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { ALLOWED_MODELS, type AiModel } from "@/lib/ai/get-ai-model";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/create-notification";
import { markAsRead } from "@/lib/notifications/list-notifications";
import type { NotificationClient } from "@/lib/notifications/types";
import { resolveAccessForUser } from "@/lib/access/get-current-access";

export async function saveAiModel(model: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");
  await assertAdmin();

  if (!ALLOWED_MODELS.includes(model as AiModel)) {
    return { success: false };
  }

  await db.appSetting.upsert({
    where: { key: "ai_model" },
    update: { value: model },
    create: { key: "ai_model", value: model },
  });

  return { success: true };
}

// ─── Tilgangsforespørsler ─────────────────────────────────────────
//
// Vi gjør all skriving i én Prisma-transaksjon: UserAccess + AccessRequest
// + endringsloggen. Endringsloggen skrives manuelt (ikke via recordChange-
// helperen) fordi vi allerede er inne i en `$transaction` — recordChange
// ville startet en ny nestet transaksjon. Resultatet er funksjonelt det
// samme: én ChangeLog med to ChangeLogEntries, atomisk med selve endringen.
//
// Status-overgangen er atomisk: vi bruker `updateMany` med
// `{ id, status: "PENDING" }` som filter. Hvis to admins klikker samtidig
// vil bare én av transaksjonene oppdatere raden — den andre får `count = 0`
// og kaster en feil. Dette unngår TOCTOU-løpet vi ville hatt med en
// pre-transaksjons `findUnique` etterfulgt av en betingelsesløs `update`.

/**
 * Godkjenn en tilgangsforespørsel. Oppretter eller oppdaterer
 * UserAccess-raden, markerer forespørselen som APPROVED, og logger
 * begge endringene i endringsloggen.
 */
export async function approveAccessRequest(
  requestId: string,
  level: "USER" | "ADMIN"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");
  await assertAdmin();

  const actorId = session.user.id;
  const actorName = session.user.name ?? null;

  // Vi henter de uforanderlige feltene (e-post, entraId, displayName) utenfor
  // transaksjonen — disse endrer seg aldri på en AccessRequest, så det er
  // trygt. Status-overgangen sjekkes derimot atomisk inne i transaksjonen.
  const request = await db.accessRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      email: true,
      entraId: true,
      displayName: true,
    },
  });

  if (!request) throw new Error("Forespørselen finnes ikke");

  const result = await db.$transaction(async (tx) => {
    // Eksisterende rad? Match på entraId først, deretter e-post.
    const existing = await tx.userAccess.findFirst({
      where: {
        OR: [
          ...(request.entraId ? [{ entraId: request.entraId }] : []),
          { email: request.email },
        ],
      },
      select: { id: true, level: true },
    });

    let userAccessId: string;
    let oldLevel: "MINIMUM" | "USER" | "ADMIN" | null;

    if (existing) {
      userAccessId = existing.id;
      oldLevel = existing.level;
      await tx.userAccess.update({
        where: { id: existing.id },
        data: {
          level,
          grantedById: actorId,
          grantedAt: new Date(),
          ...(request.entraId ? { entraId: request.entraId } : {}),
          displayName: request.displayName ?? undefined,
        },
      });
    } else {
      const created = await tx.userAccess.create({
        data: {
          email: request.email,
          entraId: request.entraId,
          displayName: request.displayName,
          level,
          grantedById: actorId,
          grantedAt: new Date(),
        },
        select: { id: true },
      });
      userAccessId = created.id;
      oldLevel = null;
    }

    // Atomisk status-overgang: kun én transaksjon kan flytte raden ut av
    // PENDING. Hvis count === 0 har en annen admin allerede behandlet den.
    const transition = await tx.accessRequest.updateMany({
      where: { id: request.id, status: "PENDING" },
      data: {
        status: "APPROVED",
        resolvedById: actorId,
        resolvedByName: actorName,
        resolvedAt: new Date(),
        userAccessId,
      },
    });

    if (transition.count !== 1) {
      throw new Error("Forespørselen er allerede behandlet");
    }

    // Endringslogg, atomisk i samme transaksjon.
    const log = await tx.changeLog.create({
      data: {
        actorType: "USER",
        actorId,
        actorName,
        source: "USER_ACTION",
        summary: `Godkjente tilgang (${level}) for ${request.email}`,
      },
    });
    await tx.changeLogEntry.createMany({
      data: [
        {
          changeLogId: log.id,
          model: "UserAccess",
          recordId: userAccessId,
          field: "level",
          oldValue: oldLevel ?? Prisma.JsonNull,
          newValue: level,
        },
        {
          changeLogId: log.id,
          model: "AccessRequest",
          recordId: request.id,
          field: "status",
          oldValue: "PENDING",
          newValue: "APPROVED",
        },
      ],
    });

    // Direkte varsel til brukeren som ble godkjent (om vi kjenner deres
    // entraId — det er det vi bruker som userId i targetUserId-feltet).
    if (request.entraId) {
      await createNotification(tx as unknown as NotificationClient, {
        kind: "ACCESS_REQUEST",
        severity: "INFO",
        title: `Tilgangsforespørselen din ble godkjent (${level})`,
        body: `Du har nå ${level}-tilgang i NRT internal-tools.`,
        payload: { requestId: request.id, level },
        targetUserId: request.entraId,
      });
    }

    return { userAccessId };
  });

  revalidatePath("/settings");
  return { ok: true, userAccessId: result.userAccessId };
}

/**
 * Avslå en tilgangsforespørsel med en valgfri begrunnelse.
 */
export async function denyAccessRequest(requestId: string, note?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");
  await assertAdmin();

  const actorId = session.user.id;
  const actorName = session.user.name ?? null;

  // Hent de uforanderlige feltene utenfor transaksjonen (vi trenger e-posten
  // for endringsloggens summary). Status-sjekken gjøres atomisk inne i tx.
  const request = await db.accessRequest.findUnique({
    where: { id: requestId },
    select: { id: true, email: true, entraId: true },
  });
  if (!request) throw new Error("Forespørselen finnes ikke");

  await db.$transaction(async (tx) => {
    const transition = await tx.accessRequest.updateMany({
      where: { id: request.id, status: "PENDING" },
      data: {
        status: "DENIED",
        resolvedById: actorId,
        resolvedByName: actorName,
        resolvedAt: new Date(),
        resolutionNote: note?.trim() || null,
      },
    });

    if (transition.count !== 1) {
      throw new Error("Forespørselen er allerede behandlet");
    }

    const log = await tx.changeLog.create({
      data: {
        actorType: "USER",
        actorId,
        actorName,
        source: "USER_ACTION",
        summary: `Avslo tilgang for ${request.email}`,
      },
    });
    await tx.changeLogEntry.createMany({
      data: [
        {
          changeLogId: log.id,
          model: "AccessRequest",
          recordId: request.id,
          field: "status",
          oldValue: "PENDING",
          newValue: "DENIED",
        },
      ],
    });

    // Direkte varsel til brukeren som ble avslått (hvis vi kjenner entraId).
    if (request.entraId) {
      await createNotification(tx as unknown as NotificationClient, {
        kind: "ACCESS_REQUEST",
        severity: "WARNING",
        title: "Tilgangsforespørselen din ble avslått",
        body: note?.trim() || null,
        payload: { requestId: request.id },
        targetUserId: request.entraId,
      });
    }
  });

  revalidatePath("/settings");
  return { ok: true };
}

// ─── Notifikasjoner ───────────────────────────────────────────────
//
// Markerer et sett notifikasjoner som lest. Brukes av notification-bell
// i header når brukeren åpner popoveren. Vi krever bare innlogget bruker
// (ikke admin) — alle skal kunne kvittere ut sine egne varsler. Helperen
// `markAsRead` filtrerer på `readAt: null` og er idempotent.

/**
 * Marker en eller flere notifikasjoner som lest. Sikker mot overskriving
 * av eldre `readAt` (helperen filtrerer på `readAt: null`).
 */
export async function markNotificationsRead(ids: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");

  if (!Array.isArray(ids) || ids.length === 0) return { ok: true };

  const access = await resolveAccessForUser(session.user);
  await markAsRead(db as unknown as NotificationClient, ids, {
    userId: session.user.id,
    accessLevel: access.level,
  });
  revalidatePath("/settings");
  return { ok: true };
}
