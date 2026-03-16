import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

interface GridFilters {
  search?: string;
  crew?: string;
  company?: string;
  location?: string;
}

export async function getResourcePlan(year: number) {
  return db.resourcePlan.findUnique({
    where: { year },
  });
}

export async function getResourcePlanGrid(
  planId: string,
  startDate: Date,
  endDate: Date,
  filters?: GridFilters
) {
  const entryWhere: Prisma.ResourcePlanEntryWhereInput = {
    resourcePlanId: planId,
  };

  if (filters?.search) {
    entryWhere.displayName = { contains: filters.search, mode: "insensitive" };
  }
  if (filters?.crew) {
    entryWhere.crew = filters.crew;
  }
  if (filters?.company) {
    entryWhere.company = filters.company;
  }
  if (filters?.location) {
    entryWhere.location = filters.location;
  }

  return db.resourcePlanEntry.findMany({
    where: entryWhere,
    include: {
      allocations: {
        where: {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        orderBy: { startDate: "asc" },
      },
      personnel: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
  });
}

export async function getResourcePlanLabels(planId: string) {
  return db.resourcePlanLabel.findMany({
    where: { resourcePlanId: planId },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getResourcePlanStats(planId: string, date?: Date) {
  const targetDate = date ?? new Date();

  const entries = await db.resourcePlanEntry.findMany({
    where: { resourcePlanId: planId },
    include: {
      allocations: {
        where: {
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
      },
    },
  });

  const totalEntries = entries.length;
  let assignedToday = 0;
  const byLabel: Record<string, number> = {};

  for (const entry of entries) {
    if (entry.allocations.length > 0) {
      assignedToday++;
      for (const alloc of entry.allocations) {
        byLabel[alloc.label] = (byLabel[alloc.label] ?? 0) + 1;
      }
    }
  }

  return { totalEntries, assignedToday, byLabel };
}

export async function getDistinctCrews(planId: string) {
  const results = await db.resourcePlanEntry.findMany({
    where: { resourcePlanId: planId, crew: { not: null } },
    select: { crew: true },
    distinct: ["crew"],
    orderBy: { crew: "asc" },
  });
  return results.map((r) => r.crew).filter(Boolean) as string[];
}

export async function getDistinctCompanies(planId: string) {
  const results = await db.resourcePlanEntry.findMany({
    where: { resourcePlanId: planId, company: { not: null } },
    select: { company: true },
    distinct: ["company"],
    orderBy: { company: "asc" },
  });
  return results.map((r) => r.company).filter(Boolean) as string[];
}

export async function getDistinctLocations(planId: string) {
  const results = await db.resourcePlanEntry.findMany({
    where: { resourcePlanId: planId, location: { not: null } },
    select: { location: true },
    distinct: ["location"],
    orderBy: { location: "asc" },
  });
  return results.map((r) => r.location).filter(Boolean) as string[];
}

export async function getOrCreateResourcePlan(year: number, userId: string, userName: string) {
  const existing = await db.resourcePlan.findUnique({ where: { year } });
  if (existing) return existing;

  return db.resourcePlan.create({
    data: {
      year,
      name: `Ressursplan ${year}`,
      createdById: userId,
      createdBy: userName,
    },
  });
}
