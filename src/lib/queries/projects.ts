import { db } from "@/lib/db";

export async function getProjectList(search?: string, customerId?: string) {
  return db.project.findMany({
    where: {
      ...(search && { name: { contains: search, mode: "insensitive" as const } }),
      ...(customerId && { customerId }),
      status: { not: "ARCHIVED" },
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
