"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCanModify, assertAdmin } from "@/lib/rbac";
import {
  createDocumentSchema,
  updateDocumentSchema,
  createVersionSchema,
  approveVersionSchema,
  linkSupplierSchema,
} from "@/lib/validations/document";
import { generateDocNumber } from "@/lib/queries/documents";
import { revalidatePath } from "next/cache";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
  id?: string;
};

// ─── Document CRUD ────────────────────────────────────────────

export async function createDocument(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createDocumentSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const docNumber = await generateDocNumber(parsed.data.category);
  const reviewCycleMonths = parsed.data.reviewCycleMonths ?? 12;
  const nextReviewDate = new Date();
  nextReviewDate.setMonth(nextReviewDate.getMonth() + reviewCycleMonths);

  const doc = await db.$transaction(async (tx) => {
    const d = await tx.document.create({
      data: {
        docNumber,
        title: parsed.data.title,
        category: parsed.data.category,
        responsibleId: session.user.id,
        responsibleName: parsed.data.responsibleName,
        reviewCycleMonths,
        nextReviewDate,
        createdById: session.user.id,
        createdByName: session.user.name ?? "Ukjent",
      },
    });
    // Auto-create first version as draft
    await tx.documentVersion.create({
      data: {
        documentId: d.id,
        versionNumber: 1,
        status: "DRAFT",
        isCurrent: true,
        createdById: session.user.id,
        createdByName: session.user.name ?? "Ukjent",
      },
    });
    await tx.documentAuditLog.create({
      data: {
        documentId: d.id,
        action: "CREATED",
        details: JSON.stringify({ docNumber, category: parsed.data.category }),
        userId: session.user.id,
        userName: session.user.name ?? "Ukjent",
      },
    });
    return d;
  });

  revalidatePath("/dokumenter");
  return { success: true, message: `Dokument ${docNumber} opprettet`, id: doc.id };
}

export async function updateDocument(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = updateDocumentSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { id, ...updateData } = parsed.data;

  const resource = await db.document.findUniqueOrThrow({
    where: { id },
    select: { createdById: true },
  });
  await assertCanModify(resource);

  await db.$transaction(async (tx) => {
    await tx.document.update({ where: { id }, data: updateData });
    await tx.documentAuditLog.create({
      data: {
        documentId: id,
        action: "UPDATED",
        details: JSON.stringify(updateData),
        userId: session.user.id,
        userName: session.user.name ?? "Ukjent",
      },
    });
  });

  revalidatePath(`/dokumenter/${id}`);
  return { success: true, message: "Dokument oppdatert" };
}

export async function deleteDocument(documentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const resource = await db.document.findUniqueOrThrow({
    where: { id: documentId },
    select: { createdById: true },
  });
  await assertCanModify(resource);

  await db.document.update({
    where: { id: documentId },
    data: { isActive: false },
  });
  revalidatePath("/dokumenter");
}

// ─── Versions ─────────────────────────────────────────────────

export async function createVersion(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createVersionSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { documentId, changeDescription, fileName, fileUrl } = parsed.data;

  await db.$transaction(async (tx) => {
    // Get next version number
    const latest = await tx.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    await tx.documentVersion.create({
      data: {
        documentId,
        versionNumber,
        status: "DRAFT",
        changeDescription,
        fileName,
        fileUrl,
        createdById: session.user.id,
        createdByName: session.user.name ?? "Ukjent",
      },
    });
    await tx.documentAuditLog.create({
      data: {
        documentId,
        action: "VERSION_CREATED",
        details: JSON.stringify({ versionNumber, changeDescription }),
        userId: session.user.id,
        userName: session.user.name ?? "Ukjent",
      },
    });
  });

  revalidatePath(`/dokumenter/${documentId}`);
  return { success: true, message: "Ny versjon opprettet" };
}

export async function submitForReview(versionId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const version = await db.documentVersion.findUniqueOrThrow({ where: { id: versionId } });

  await db.$transaction(async (tx) => {
    await tx.documentVersion.update({
      where: { id: versionId },
      data: { status: "REVIEW" },
    });
    await tx.documentAuditLog.create({
      data: {
        documentId: version.documentId,
        action: "SUBMITTED_FOR_REVIEW",
        details: JSON.stringify({ versionNumber: version.versionNumber }),
        userId: session.user.id,
        userName: session.user.name ?? "Ukjent",
      },
    });
  });

  revalidatePath(`/dokumenter/${version.documentId}`);
  return { success: true, message: "Sendt til gjennomgang" };
}

export async function approveVersion(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };
  await assertAdmin();

  const parsed = approveVersionSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { id, action } = parsed.data;
  const version = await db.documentVersion.findUniqueOrThrow({
    where: { id },
    include: { document: { select: { reviewCycleMonths: true } } },
  });

  if (action === "APPROVE") {
    // Atomically swap isCurrent
    await db.$transaction(async (tx) => {
      await tx.documentVersion.updateMany({
        where: { documentId: version.documentId, isCurrent: true },
        data: { isCurrent: false },
      });
      await tx.documentVersion.update({
        where: { id },
        data: {
          status: "APPROVED",
          isCurrent: true,
          approvedAt: new Date(),
          approvedById: session.user.id,
          approvedByName: session.user.name ?? "Ukjent",
        },
      });
      // Update next review date
      const reviewCycleMonths = version.document.reviewCycleMonths ?? 12;
      const nextReview = new Date();
      nextReview.setMonth(nextReview.getMonth() + reviewCycleMonths);
      await tx.document.update({
        where: { id: version.documentId },
        data: { nextReviewDate: nextReview },
      });
      await tx.documentAuditLog.create({
        data: {
          documentId: version.documentId,
          action: "VERSION_APPROVED",
          details: JSON.stringify({ versionNumber: version.versionNumber }),
          userId: session.user.id,
          userName: session.user.name ?? "Ukjent",
        },
      });
    });
  } else if (action === "REJECT") {
    await db.$transaction(async (tx) => {
      await tx.documentVersion.update({
        where: { id },
        data: { status: "DRAFT" },
      });
      await tx.documentAuditLog.create({
        data: {
          documentId: version.documentId,
          action: "VERSION_REJECTED",
          details: JSON.stringify({ versionNumber: version.versionNumber }),
          userId: session.user.id,
          userName: session.user.name ?? "Ukjent",
        },
      });
    });
  } else if (action === "OBSOLETE") {
    await db.$transaction(async (tx) => {
      await tx.documentVersion.update({
        where: { id },
        data: { status: "OBSOLETE", isCurrent: false },
      });
      await tx.documentAuditLog.create({
        data: {
          documentId: version.documentId,
          action: "VERSION_OBSOLETED",
          details: JSON.stringify({ versionNumber: version.versionNumber }),
          userId: session.user.id,
          userName: session.user.name ?? "Ukjent",
        },
      });
    });
  }

  revalidatePath(`/dokumenter/${version.documentId}`);
  return { success: true, message: action === "APPROVE" ? "Versjon godkjent" : action === "REJECT" ? "Versjon avvist" : "Versjon markert som utgått" };
}

// ─── Supplier Links ───────────────────────────────────────────

export async function linkDocumentSupplier(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = linkSupplierSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await db.documentSupplier.create({ data: parsed.data });
  revalidatePath(`/dokumenter/${parsed.data.documentId}`);
  return { success: true, message: "Leverandør koblet" };
}

export async function unlinkDocumentSupplier(
  linkId: string,
  documentId: string
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  await db.documentSupplier.delete({ where: { id: linkId } });
  revalidatePath(`/dokumenter/${documentId}`);
  return { success: true, message: "Kobling fjernet" };
}
