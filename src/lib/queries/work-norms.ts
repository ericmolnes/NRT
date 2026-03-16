import { db } from "@/lib/db";
import type { Discipline } from "@/generated/prisma/client";

export async function getNormCategories() {
  return db.normCategory.findMany({
    include: { norms: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
}

export async function getNormsByDiscipline(discipline: Discipline) {
  return db.normCategory.findMany({
    where: { discipline },
    include: { norms: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
}

export async function getNormById(id: string) {
  return db.workNorm.findUnique({
    where: { id },
    include: { category: true },
  });
}

export async function findMatchingNorm(
  discipline: Discipline,
  categoryName: string,
  sizeRange?: string
) {
  return db.workNorm.findFirst({
    where: {
      category: { discipline, name: { contains: categoryName, mode: "insensitive" } },
      ...(sizeRange ? { sizeRange } : {}),
    },
  });
}
