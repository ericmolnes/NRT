import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

interface EvaluationFilters {
  search?: string;
  role?: string;
  scoreRange?: "high" | "mid" | "low";
}

export async function getEvaluations(filters?: EvaluationFilters) {
  const where: Prisma.EvaluationWhereInput = {};

  const personnelWhere: Prisma.PersonnelWhereInput = {
    ...(filters?.search
      ? { name: { contains: filters.search, mode: "insensitive" } }
      : {}),
    ...roleFilterWhere(filters?.role),
  };
  if (Object.keys(personnelWhere).length > 0) {
    where.personnel = personnelWhere;
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
      db.personnel.count({ where: { status: "ACTIVE" } }),
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

function roleFilterWhere(
  roleFilter?: string | null
): Prisma.PersonnelWhereInput {
  if (!roleFilter) return {};
  if (roleFilter === "Innleid") {
    return {
      OR: [
        { recmanCandidate: { isContractor: true } },
        { recmanCandidate: null, role: "Innleid" },
      ],
    };
  }
  if (roleFilter === "Ansatt") {
    return {
      OR: [
        { recmanCandidate: { isEmployee: true, isContractor: false } },
        { recmanCandidate: null, role: "Ansatt" },
      ],
    };
  }
  return { role: roleFilter };
}

export async function getAllPersonnel(roleFilter?: string | null) {
  return db.personnel.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
      recmanCandidate: {
        select: {
          corporationId: true,
          isContractor: true,
          isEmployee: true,
        },
      },
    },
    where: {
      AND: [
        {
          OR: [
            { status: "ACTIVE" },
            {
              status: "INACTIVE",
              recmanCandidate: { isContractor: true },
            },
          ],
        },
        roleFilterWhere(roleFilter),
      ],
    },
    orderBy: { name: "asc" },
  });
}

/** Includes INACTIVE so former contractors stay evaluatable via old links. */
export async function getPersonnelForPublicForm(roleFilter?: string | null) {
  return db.personnel.findMany({
    select: { id: true, name: true, role: true },
    where: {
      status: { not: "ARCHIVED" },
      ...roleFilterWhere(roleFilter),
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
  const where: Prisma.PersonnelWhereInput = {
    status: "ACTIVE",
    ...(filters?.search
      ? { name: { contains: filters.search, mode: "insensitive" } }
      : {}),
    ...roleFilterWhere(filters?.role),
  };

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

