"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCanModify, assertAdmin } from "@/lib/rbac";
import {
  createSupplierSchema,
  updateSupplierSchema,
  approveSupplierSchema,
  supplierReviewSchema,
  supplierEvaluationSchema,
} from "@/lib/validations/supplier";
import { createNCSchema, createCAPASchema, updateCAPASchema } from "@/lib/validations/non-conformance";
import { revalidatePath } from "next/cache";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
  id?: string;
};

// ─── Leverandør CRUD ──────────────────────────────────────────

export async function createSupplier(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createSupplierSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const supplier = await db.$transaction(async (tx) => {
    const s = await tx.supplier.create({
      data: {
        ...parsed.data,
        createdById: session.user.id,
        createdByName: session.user.name ?? "Ukjent",
      },
    });
    await tx.supplierAuditLog.create({
      data: {
        supplierId: s.id,
        action: "CREATED",
        details: JSON.stringify({ type: parsed.data.type }),
        userId: session.user.id,
        userName: session.user.name ?? "Ukjent",
      },
    });
    return s;
  });

  revalidatePath("/leverandorer");
  return { success: true, message: "Leverandør opprettet", id: supplier.id };
}

export async function updateSupplier(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = updateSupplierSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { id, ...updateData } = parsed.data;

  const resource = await db.supplier.findUniqueOrThrow({
    where: { id },
    select: { createdById: true },
  });
  await assertCanModify(resource);

  await db.$transaction(async (tx) => {
    await tx.supplier.update({ where: { id }, data: updateData });
    await tx.supplierAuditLog.create({
      data: {
        supplierId: id,
        action: "UPDATED",
        details: JSON.stringify(updateData),
        userId: session.user.id,
        userName: session.user.name ?? "Ukjent",
      },
    });
  });

  revalidatePath(`/leverandorer/${id}`);
  return { success: true, message: "Leverandør oppdatert" };
}

export async function deleteSupplier(supplierId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const resource = await db.supplier.findUniqueOrThrow({
    where: { id: supplierId },
    select: { createdById: true },
  });
  await assertCanModify(resource);

  await db.supplier.delete({ where: { id: supplierId } });
  revalidatePath("/leverandorer");
}

// ─── Godkjenning (admin) ──────────────────────────────────────

export async function approveSupplier(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };
  await assertAdmin();

  const parsed = approveSupplierSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { id, status, expiresAt, notes } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id },
      data: {
        status,
        approvedAt: status === "APPROVED" || status === "CONDITIONAL" ? new Date() : undefined,
        approvedById: session.user.id,
        approvedByName: session.user.name ?? "Ukjent",
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });
    await tx.supplierAuditLog.create({
      data: {
        supplierId: id,
        action: "STATUS_CHANGED",
        details: JSON.stringify({ status, notes }),
        userId: session.user.id,
        userName: session.user.name ?? "Ukjent",
      },
    });
  });

  revalidatePath(`/leverandorer/${id}`);
  return { success: true, message: `Leverandør ${status === "APPROVED" ? "godkjent" : status === "REJECTED" ? "avvist" : "betinget godkjent"}` };
}

// ─── Revisjon ─────────────────────────────────────────────────

export async function addReview(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };
  await assertAdmin();

  const parsed = supplierReviewSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { supplierId, reviewDate, nextReviewDate, outcome, summary } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.supplierReview.create({
      data: {
        supplierId,
        reviewDate: new Date(reviewDate),
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null,
        reviewedById: session.user.id,
        reviewedByName: session.user.name ?? "Ukjent",
        outcome,
        summary,
      },
    });
    await tx.supplier.update({
      where: { id: supplierId },
      data: {
        status: outcome,
        expiresAt: nextReviewDate ? new Date(nextReviewDate) : undefined,
      },
    });
    await tx.supplierAuditLog.create({
      data: {
        supplierId,
        action: "REVIEWED",
        details: JSON.stringify({ outcome, summary }),
        userId: session.user.id,
        userName: session.user.name ?? "Ukjent",
      },
    });
  });

  revalidatePath(`/leverandorer/${supplierId}`);
  return { success: true, message: "Revisjon registrert" };
}

// ─── Evaluering ───────────────────────────────────────────────

export async function addEvaluation(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = supplierEvaluationSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { supplierId, qualityScore, deliveryScore, priceScore, hseScore, communicationScore, ...rest } = parsed.data;
  const weightedTotal =
    (qualityScore * 0.30 + deliveryScore * 0.25 + priceScore * 0.20 + hseScore * 0.15 + communicationScore * 0.10) * 20;

  await db.$transaction(async (tx) => {
    await tx.supplierEvaluation.create({
      data: {
        supplierId,
        qualityScore,
        deliveryScore,
        priceScore,
        hseScore,
        communicationScore,
        weightedTotal: Math.round(weightedTotal * 10) / 10,
        evaluatedById: session.user.id,
        evaluatedByName: session.user.name ?? "Ukjent",
        ...rest,
      },
    });
    await tx.supplierAuditLog.create({
      data: {
        supplierId,
        action: "EVALUATED",
        details: JSON.stringify({ weightedTotal: Math.round(weightedTotal * 10) / 10 }),
        userId: session.user.id,
        userName: session.user.name ?? "Ukjent",
      },
    });
  });

  revalidatePath(`/leverandorer/${supplierId}`);
  return { success: true, message: "Evaluering registrert" };
}

// ─── Avvik (Non-Conformance) ──────────────────────────────────

export async function createNC(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createNCSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { supplierId, title, description, severity, detectedDate } = parsed.data;

  const nc = await db.$transaction(async (tx) => {
    // Generate NC number: NC-{year}-{seq}
    const year = new Date().getFullYear();
    const prefix = `NC-${year}-`;
    const latest = await tx.nonConformance.findFirst({
      where: { ncNumber: { startsWith: prefix } },
      orderBy: { ncNumber: "desc" },
      select: { ncNumber: true },
    });
    const seq = latest
      ? parseInt(latest.ncNumber.split("-")[2]) + 1
      : 1;
    const ncNumber = `${prefix}${String(seq).padStart(3, "0")}`;

    const created = await tx.nonConformance.create({
      data: {
        ncNumber,
        supplierId,
        title,
        description,
        severity: severity ?? 1,
        detectedDate: detectedDate ? new Date(detectedDate) : new Date(),
        reportedById: session.user.id,
        reportedByName: session.user.name ?? "Ukjent",
      },
    });

    await tx.supplierAuditLog.create({
      data: {
        supplierId,
        action: "NC_CREATED",
        details: JSON.stringify({ ncNumber, title, severity }),
        userId: session.user.id,
        userName: session.user.name ?? "Ukjent",
      },
    });

    return created;
  });

  revalidatePath(`/leverandorer/${supplierId}`);
  return { success: true, message: `Avvik ${nc.ncNumber} opprettet`, id: nc.id };
}

export async function updateNCStatus(
  id: string,
  status: "OPEN" | "INVESTIGATING" | "ACTION_REQUIRED" | "CLOSED" | "CANCELLED"
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const nc = await db.nonConformance.findUniqueOrThrow({ where: { id } });

  await db.$transaction(async (tx) => {
    await tx.nonConformance.update({
      where: { id },
      data: {
        status,
        ...(status === "CLOSED" && {
          closedDate: new Date(),
          closedById: session.user.id,
          closedByName: session.user.name ?? "Ukjent",
        }),
      },
    });
    await tx.supplierAuditLog.create({
      data: {
        supplierId: nc.supplierId,
        action: "NC_STATUS_CHANGED",
        details: JSON.stringify({ ncNumber: nc.ncNumber, from: nc.status, to: status }),
        userId: session.user.id,
        userName: session.user.name ?? "Ukjent",
      },
    });
  });

  revalidatePath(`/leverandorer/${nc.supplierId}`);
  return { success: true, message: "Avviksstatus oppdatert" };
}

// ─── Korrigerende tiltak (CAPA) ───────────────────────────────

export async function createCAPA(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createCAPASchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { nonConformanceId, type, description, responsibleName, dueDate } = parsed.data;

  const nc = await db.nonConformance.findUniqueOrThrow({
    where: { id: nonConformanceId },
    select: { supplierId: true },
  });

  await db.$transaction(async (tx) => {
    await tx.correctiveAction.create({
      data: {
        nonConformanceId,
        type,
        description,
        responsibleId: session.user.id,
        responsibleName,
        dueDate: new Date(dueDate),
      },
    });
    // Set NC status to ACTION_REQUIRED if it's OPEN or INVESTIGATING
    await tx.nonConformance.update({
      where: { id: nonConformanceId },
      data: { status: "ACTION_REQUIRED" },
    });
  });

  revalidatePath(`/leverandorer/${nc.supplierId}`);
  return { success: true, message: "Korrigerende tiltak opprettet" };
}

export async function updateCAPA(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = updateCAPASchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { id, status, completedDate, evidence } = parsed.data;

  const capa = await db.correctiveAction.findUniqueOrThrow({
    where: { id },
    include: { nonConformance: { select: { supplierId: true } } },
  });

  await db.correctiveAction.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(completedDate && { completedDate: new Date(completedDate) }),
      ...(evidence && { evidence }),
      ...(status === "VERIFIED" && {
        verifiedById: session.user.id,
        verifiedByName: session.user.name ?? "Ukjent",
        verifiedDate: new Date(),
      }),
    },
  });

  revalidatePath(`/leverandorer/${capa.nonConformance.supplierId}`);
  return { success: true, message: "Tiltak oppdatert" };
}
