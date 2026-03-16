import { db } from "@/lib/db";

export async function getRotationPatterns() {
  return db.rotationPattern.findMany({
    where: { isActive: true },
    include: {
      segments: { orderBy: { sortOrder: "asc" } },
      _count: { select: { jobs: true, assignments: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getAllRotationPatterns() {
  return db.rotationPattern.findMany({
    include: {
      segments: { orderBy: { sortOrder: "asc" } },
      _count: { select: { jobs: true, assignments: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getRotationPatternById(id: string) {
  return db.rotationPattern.findUnique({
    where: { id },
    include: {
      segments: { orderBy: { sortOrder: "asc" } },
      jobs: { select: { id: true, name: true, status: true } },
    },
  });
}
