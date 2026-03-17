import { db } from "@/lib/db";
import type { DocumentCategory } from "@/generated/prisma/client";

const categoryAbbreviations: Record<string, string> = {
  PROCEDURE: "PRO",
  WORK_INSTRUCTION: "WI",
  FORM_TEMPLATE: "FRM",
  POLICY: "POL",
  RECORD: "REC",
  EXTERNAL: "EXT",
};

export function getCategoryAbbreviation(category: string) {
  return categoryAbbreviations[category] ?? "DOC";
}

export async function getDocumentList(search?: string, category?: string) {
  return db.document.findMany({
    where: {
      isActive: true,
      ...(search && { title: { contains: search, mode: "insensitive" as const } }),
      ...(category && { category: category as DocumentCategory }),
    },
    include: {
      versions: {
        where: { isCurrent: true },
        take: 1,
        select: {
          id: true,
          versionNumber: true,
          status: true,
          approvedAt: true,
        },
      },
      _count: { select: { versions: true, supplierLinks: true } },
    },
    orderBy: { docNumber: "asc" },
  });
}

export async function getDocumentById(id: string) {
  return db.document.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
      },
      supplierLinks: {
        include: {
          supplier: { select: { id: true, name: true, status: true } },
        },
      },
      auditLog: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
}

export async function getDocumentStats() {
  const [total, procedures, workInstructions, needingReview] = await Promise.all([
    db.document.count({ where: { isActive: true } }),
    db.document.count({ where: { isActive: true, category: "PROCEDURE" } }),
    db.document.count({ where: { isActive: true, category: "WORK_INSTRUCTION" } }),
    db.document.count({
      where: {
        isActive: true,
        nextReviewDate: { lte: new Date() },
      },
    }),
  ]);
  return { total, procedures, workInstructions, needingReview };
}

export async function getDocumentsNeedingReview() {
  return db.document.findMany({
    where: {
      isActive: true,
      nextReviewDate: { lte: new Date() },
    },
    select: {
      id: true,
      docNumber: true,
      title: true,
      category: true,
      responsibleName: true,
      nextReviewDate: true,
    },
    orderBy: { nextReviewDate: "asc" },
  });
}

export async function generateDocNumber(category: string) {
  const abbr = getCategoryAbbreviation(category);
  const prefix = `NRT-${abbr}-`;
  const latest = await db.document.findFirst({
    where: { docNumber: { startsWith: prefix } },
    orderBy: { docNumber: "desc" },
    select: { docNumber: true },
  });
  const seq = latest
    ? parseInt(latest.docNumber.split("-")[2]) + 1
    : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}
