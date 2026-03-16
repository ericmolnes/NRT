import { db } from "@/lib/db";
import type { EstimateStatus } from "@/generated/prisma/client";

export interface EstimateFilters {
  search?: string;
  status?: string;
}

export async function getEstimateList(filters?: EstimateFilters) {
  return db.estimate.findMany({
    where: {
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              {
                projectNumber: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(filters?.status
        ? { status: filters.status as EstimateStatus }
        : {}),
    },
    include: {
      rateProfile: { select: { name: true } },
      _count: {
        select: {
          cables: true,
          equipment: true,
          lineItems: true,
          scopeItems: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEstimateStats() {
  const [total, draft, review, approved] = await Promise.all([
    db.estimate.count(),
    db.estimate.count({ where: { status: "DRAFT" } }),
    db.estimate.count({ where: { status: "REVIEW" } }),
    db.estimate.count({ where: { status: "APPROVED" } }),
  ]);
  return { total, draft, review, approved };
}

export async function getEstimateById(id: string) {
  return db.estimate.findUnique({
    where: { id },
    include: {
      rateProfile: { include: { rates: true } },
      cables: { orderBy: { tagNumber: "asc" } },
      equipment: { orderBy: { tagNumber: "asc" } },
      scopeItems: { orderBy: { discipline: "asc" } },
      lineItems: {
        include: { product: true },
        orderBy: { description: "asc" },
      },
      assumptions: { orderBy: { key: "asc" } },
      laborSummary: { orderBy: { discipline: "asc" } },
      actualTimeEntries: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getNormCategories() {
  return db.normCategory.findMany({
    include: { norms: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
}

export async function searchProducts(query: string, limit = 20) {
  return db.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { productId: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { name: "asc" },
  });
}

export async function getEstimateActualVsEstimated(estimateId: string) {
  const entries = await db.actualTimeEntry.findMany({
    where: { estimateId },
    orderBy: { category: "asc" },
  });
  return entries;
}

export async function getNormStatistics(normId: string) {
  const entries = await db.actualTimeEntry.findMany({
    where: { normId, adjustmentFactor: null },
  });
  if (entries.length === 0) return null;
  const ratios = entries.map((e) => e.actualHours / e.estimatedHours);
  const avg = ratios.reduce((s, r) => s + r, 0) / ratios.length;
  const variance =
    ratios.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / ratios.length;
  const stdDev = Math.sqrt(variance);
  return {
    dataPoints: entries.length,
    avgRatio: avg,
    stdDeviation: stdDev,
    avgActualHours:
      entries.reduce((s, e) => s + e.actualHours, 0) / entries.length,
    avgEstimatedHours:
      entries.reduce((s, e) => s + e.estimatedHours, 0) / entries.length,
  };
}
