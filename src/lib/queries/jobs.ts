import { db } from "@/lib/db";

export async function getJobList(search?: string, projectId?: string, status?: string) {
  return db.job.findMany({
    where: {
      ...(search && { name: { contains: search, mode: "insensitive" as const } }),
      ...(projectId && { projectId }),
      ...(status && { status: status as "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" }),
    },
    include: {
      project: {
        select: { id: true, name: true, customer: { select: { id: true, name: true } } },
      },
      rotationPattern: { select: { id: true, name: true, totalCycleDays: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getJobById(id: string) {
  return db.job.findUnique({
    where: { id },
    include: {
      project: {
        include: { customer: { select: { id: true, name: true } } },
      },
      rotationPattern: {
        include: { segments: { orderBy: { sortOrder: "asc" } } },
      },
      assignments: {
        include: {
          personnel: { select: { id: true, name: true, role: true, department: true, status: true } },
          rotationPattern: { select: { id: true, name: true } },
          _count: { select: { allocations: true } },
        },
        orderBy: [{ isActive: "desc" }, { startDate: "asc" }],
      },
    },
  });
}

export async function getJobAssignment(id: string) {
  return db.jobAssignment.findUnique({
    where: { id },
    include: {
      job: {
        include: {
          rotationPattern: { include: { segments: { orderBy: { sortOrder: "asc" } } } },
        },
      },
      rotationPattern: { include: { segments: { orderBy: { sortOrder: "asc" } } } },
      personnel: { select: { id: true, name: true } },
    },
  });
}
