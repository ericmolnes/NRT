import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

interface EvaluationFilters {
  search?: string;
  role?: string;
  scoreRange?: "high" | "mid" | "low";
}

export async function getEvaluations(filters?: EvaluationFilters) {
  const where: Prisma.EvaluationWhereInput = {};

  if (filters?.search) {
    where.personnel = {
      name: { contains: filters.search, mode: "insensitive" },
    };
  }

  if (filters?.role) {
    where.personnel = {
      ...(where.personnel as Prisma.PersonnelWhereInput),
      role: filters.role,
    };
  }

  if (filters?.scoreRange) {
    if (filters.scoreRange === "high") {
      where.score = { gte: 8 };
    } else if (filters.scoreRange === "mid") {
      where.score = { gte: 5, lt: 8 };
    } else {
      where.score = { lt: 5 };
    }
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
export async function getPersonnelForPublicForm(roleFilter?: string | null) {
  return db.personnel.findMany({
    select: { id: true, name: true, role: true },
    where: {
      status: "ACTIVE",
      ...(roleFilter ? { role: roleFilter } : {}),
    },
    orderBy: { name: "asc" },
  });
}

export interface GroupedEvaluation {
  personnelId: string;
  name: string;
  role: string;
  avgScore: number;
  evaluationCount: number;
  latestDate: Date;
  latestEvaluator: string;
  evaluations: {
    id: string;
    score: number;
    comment: string | null;
    evaluatorName: string;
    createdAt: Date;
    criteriaScores: Record<string, number> | null;
    hpiSafety: number;
    competence: number;
    collaboration: number;
    workEthic: number;
    independence: number;
    punctuality: number;
  }[];
}

interface GroupedFilters {
  search?: string;
  role?: string;
  scoreRange?: "high" | "mid" | "low";
}

export async function getGroupedEvaluations(
  filters?: GroupedFilters
): Promise<GroupedEvaluation[]> {
  const where: Prisma.PersonnelWhereInput = { status: "ACTIVE" };

  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }
  if (filters?.role) {
    where.role = filters.role;
  }

  const personnel = await db.personnel.findMany({
    where: {
      ...where,
      evaluations: { some: {} },
    },
    include: {
      evaluations: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          score: true,
          comment: true,
          evaluatorName: true,
          createdAt: true,
          criteriaScores: true,
          hpiSafety: true,
          competence: true,
          collaboration: true,
          workEthic: true,
          independence: true,
          punctuality: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  let results: GroupedEvaluation[] = personnel.map((p) => {
    const avgScore =
      p.evaluations.reduce((sum, e) => sum + e.score, 0) /
      p.evaluations.length;
    const latest = p.evaluations[0];
    return {
      personnelId: p.id,
      name: p.name,
      role: p.role,
      avgScore: Math.round(avgScore * 10) / 10,
      evaluationCount: p.evaluations.length,
      latestDate: latest.createdAt,
      latestEvaluator: latest.evaluatorName,
      evaluations: p.evaluations.map((e) => ({
        ...e,
        criteriaScores: (e.criteriaScores as Record<string, number>) ?? null,
      })),
    };
  });

  if (filters?.scoreRange) {
    results = results.filter((r) => {
      if (filters.scoreRange === "high") return r.avgScore >= 8;
      if (filters.scoreRange === "mid")
        return r.avgScore >= 5 && r.avgScore < 8;
      return r.avgScore < 5;
    });
  }

  return results;
}

