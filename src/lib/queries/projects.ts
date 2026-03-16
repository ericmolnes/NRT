import { db } from "@/lib/db";

export async function getProjectList(search?: string, customerId?: string, status?: string) {
  return db.project.findMany({
    where: {
      ...(search && { name: { contains: search, mode: "insensitive" as const } }),
      ...(customerId && { customerId }),
      ...(status ? { status: status as "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED" } : { status: { not: "ARCHIVED" as const } }),
    },
    include: {
      customer: { select: { id: true, name: true } },
      _count: { select: { jobs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectById(id: string) {
  return db.project.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      jobs: {
        include: {
          rotationPattern: { select: { id: true, name: true } },
          _count: { select: { assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      poProject: true,
    },
  });
}
