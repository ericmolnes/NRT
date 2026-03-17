import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

interface EvaluationLinkFilters {
  department?: string;
}

export async function getEvaluationLinks(filters?: EvaluationLinkFilters) {
  const where: Prisma.EvaluationLinkWhereInput = {};

  if (filters?.department) {
    where.personnel = { recmanCandidate: { corporationId: filters.department } };
  }

  return db.evaluationLink.findMany({
    where,
    include: {
      personnel: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEvaluationLinkByToken(token: string) {
  return db.evaluationLink.findUnique({
    where: { token },
    include: {
      personnel: true,
      category: {
        include: {
          fields: { orderBy: { order: "asc" } },
        },
      },
    },
  });
}

export async function getEvaluationLinksByPersonnel(personnelId: string) {
  return db.evaluationLink.findMany({
    where: { personnelId },
    orderBy: { createdAt: "desc" },
  });
}
