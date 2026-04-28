"use server";

import { auth } from "@/lib/auth";
import { assertAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { ALLOWED_MODELS, type AiModel } from "@/lib/ai/get-ai-model";
import { revalidatePath } from "next/cache";

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

  const request = await db.accessRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      email: true,
      entraId: true,
      displayName: true,
      status: true,
    },
  });

  if (!request) throw new Error("Forespørselen finnes ikke");
  if (request.status !== "PENDING") {
    throw new Error("Forespørselen er allerede behandlet");
  }

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

    await tx.accessRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        resolvedById: actorId,
        resolvedByName: actorName,
        resolvedAt: new Date(),
        userAccessId,
      },
    });

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

  const request = await db.accessRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, email: true },
  });
  if (!request) throw new Error("Forespørselen finnes ikke");
  if (request.status !== "PENDING") {
    throw new Error("Forespørselen er allerede behandlet");
  }

  await db.$transaction(async (tx) => {
    await tx.accessRequest.update({
      where: { id: request.id },
      data: {
        status: "DENIED",
        resolvedById: actorId,
        resolvedByName: actorName,
        resolvedAt: new Date(),
        resolutionNote: note?.trim() || null,
      },
    });

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
  });

  revalidatePath("/settings");
  return { ok: true };
}
