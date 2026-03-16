import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

interface PersonnelFilters {
  search?: string;
  department?: string;
  status?: string;
  syncStatus?: string;
}

export async function getPersonnelList(filters?: PersonnelFilters) {
  const where: Prisma.PersonnelWhereInput = {};

  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }
  if (filters?.department) {
    where.OR = [
      { department: filters.department },
      { poEmployee: { department: filters.department } },
      { recmanCandidate: { corporationId: filters.department } },
    ];
  }
  if (filters?.status) {
    where.status = filters.status as Prisma.EnumPersonnelStatusFilter;
  } else {
    where.status = "ACTIVE";
  }

  // Sync status filter
  if (filters?.syncStatus === "po") {
    where.poEmployee = { isNot: null };
  } else if (filters?.syncStatus === "recman") {
    where.recmanCandidate = { isNot: null };
  } else if (filters?.syncStatus === "unlinked") {
    where.poEmployee = { is: null };
    where.recmanCandidate = { is: null };
  }

  return db.personnel.findMany({
    where,
    include: {
      evaluations: {
        select: {
          score: true,
          hpiSafety: true,
          competence: true,
          collaboration: true,
          workEthic: true,
          independence: true,
          punctuality: true,
        },
      },
      poEmployee: {
        select: { id: true, lastSyncedAt: true, isActive: true, department: true },
      },
      recmanCandidate: {
        select: { id: true, lastSyncedAt: true, isEmployee: true, title: true, imageUrl: true },
      },
    },
    orderBy: { name: "asc" },
    take: 100,
  });
}

export async function getPersonnelById(id: string) {
  return db.personnel.findUnique({
    where: { id },
    include: {
      evaluations: {
        include: { personnel: true },
        orderBy: { createdAt: "desc" },
      },
      notes: { orderBy: { createdAt: "desc" } },
      fieldValues: {
        include: {
          field: { include: { category: true } },
        },
      },
      poEmployee: true,
      recmanCandidate: true,
    },
  });
}

export async function getPersonnelStats() {
  const [total, active] = await Promise.all([
    db.personnel.count(),
    db.personnel.count({ where: { status: "ACTIVE" } }),
  ]);
  return { total, active };
}

export async function getPersonnelSyncStats() {
  const [total, active, poLinked, recmanLinked] = await Promise.all([
    db.personnel.count(),
    db.personnel.count({ where: { status: "ACTIVE" } }),
    db.personnel.count({ where: { poEmployee: { isNot: null } } }),
    db.personnel.count({ where: { recmanCandidate: { isNot: null } } }),
  ]);
  return { total, active, poLinked, recmanLinked };
}

export async function getDistinctDepartments() {
  // Hent avdelinger fra PowerOffice og Recman (ikke fra manuelt Personnel.department)
  const [poDepts, rcCorps] = await Promise.all([
    db.pOEmployee.findMany({
      where: { department: { not: null } },
      select: { department: true },
      distinct: ["department"],
    }),
    // Recman bruker corporationId som "avdeling/selskap"
    db.recmanCandidate.findMany({
      where: { isEmployee: true, corporationId: { not: null } },
      select: { corporationId: true },
      distinct: ["corporationId"],
    }),
  ]);

  const depts = new Set<string>();
  for (const po of poDepts) {
    if (po.department) depts.add(po.department);
  }
  for (const rc of rcCorps) {
    if (rc.corporationId) depts.add(rc.corporationId);
  }

  return [...depts].sort();
}

export async function getPersonnelJobsAndResources(personnelId: string) {
  const [assignments, entries] = await Promise.all([
    db.jobAssignment.findMany({
      where: { personnelId, isActive: true },
      include: {
        job: {
          include: { project: { include: { customer: true } } },
        },
        rotationPattern: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.resourcePlanEntry.findMany({
      where: { personnelId },
      include: {
        allocations: {
          where: {
            endDate: { gte: new Date() },
          },
          orderBy: { startDate: "asc" },
          take: 20,
        },
        resourcePlan: { select: { name: true, year: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return { assignments, entries };
}
