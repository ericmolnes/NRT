import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

interface EvaluationFilters {
  search?: string;
  rig?: string;
  role?: string;
}

export async function getEvaluations(filters?: EvaluationFilters) {
  const where: Prisma.EvaluationWhereInput = {};

  if (filters?.search) {
    where.personnel = {
      name: { contains: filters.search, mode: "insensitive" },
    };
  }

  if (filters?.rig) {
    where.personnel = {
      ...(where.personnel as Prisma.PersonnelWhereInput),
      rig: filters.rig,
    };
  }

  if (filters?.role) {
    where.personnel = {
      ...(where.personnel as Prisma.PersonnelWhereInput),
      role: filters.role,
    };
  }

  return db.evaluation.findMany({
    where,
    include: { personnel: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEvaluationById(id: string) {
  return db.evaluation.findUnique({
    where: { id },
    include: { personnel: true },
  });
}

export async function getEvaluationStats() {
  const [totalPersonnel, totalEvaluations, avgResult, latestEvaluation] =
    await Promise.all([
      db.personnel.count(),
      db.evaluation.count(),
      db.evaluation.aggregate({ _avg: { score: true } }),
      db.evaluation.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

  return {
    totalPersonnel,
    totalEvaluations,
    averageScore: avgResult._avg.score,
    latestEvaluationDate: latestEvaluation?.createdAt ?? null,
  };
}

export async function getAllPersonnel() {
  return db.personnel.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      recmanCandidate: { select: { corporationId: true } },
    },
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}

/** Minimal personnel data for unauthenticated public forms (evaluation links).
 *  Includes both active employees and contractors (innleide). */
export async function getPersonnelForPublicForm() {
  return db.personnel.findMany({
    select: { id: true, name: true, role: true },
    where: {
      status: "ACTIVE",
    },
    orderBy: { name: "asc" },
  });
}

export async function getDistinctRigs() {
  const results = await db.personnel.findMany({
    where: { rig: { not: null } },
    select: { rig: true },
    distinct: ["rig"],
    orderBy: { rig: "asc" },
  });
  return results.map((r) => r.rig).filter(Boolean) as string[];
}
