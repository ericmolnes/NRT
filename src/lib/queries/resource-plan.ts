import { db } from "@/lib/db";

// ─── Quarter Utilities ────────────────────────────────────────

export function getQuarterDates(quarter: number, year: number) {
  const startMonth = (quarter - 1) * 3;
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, startMonth + 3, 0);
  return { startDate, endDate };
}

export function getCurrentQuarter() {
  const now = new Date();
  return Math.ceil((now.getMonth() + 1) / 3);
}

// ─── Staffing Plan (Kunde → Jobb → Ansatte) ──────────────────

export interface StaffingAssignment {
  id: string;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  personnel: {
    id: string;
    name: string;
    role: string;
    department: string | null;
    status: string;
  };
  rotationPattern: { id: string; name: string } | null;
  allocations: {
    id: string;
    startDate: Date;
    endDate: Date;
    label: string;
    source: string;
  }[];
}

export interface StaffingJob {
  id: string;
  name: string;
  location: string;
  status: string;
  type: string;
  startDate: Date;
  endDate: Date | null;
  resourcePlanLabelName: string | null;
  assignments: StaffingAssignment[];
}

export interface StaffingCustomer {
  id: string;
  name: string;
  jobs: StaffingJob[];
}

export interface StaffingPlanData {
  customers: StaffingCustomer[];
  available: {
    id: string;
    name: string;
    role: string;
    department: string | null;
    status: string;
  }[];
  stats: {
    totalJobs: number;
    totalAssigned: number;
    totalAvailable: number;
    totalCustomers: number;
  };
}

export async function getStaffingPlan(
  startDate: Date,
  endDate: Date,
  search?: string
): Promise<StaffingPlanData> {

  const jobs = await db.job.findMany({
    where: {
      status: { in: ["ACTIVE", "DRAFT", "ON_HOLD"] },
      startDate: { lte: endDate },
      OR: [
        { endDate: { gte: startDate } },
        { endDate: null },
      ],
      ...(search && {
        assignments: {
          some: {
            isActive: true,
            personnel: { name: { contains: search, mode: "insensitive" as const } },
          },
        },
      }),
    },
    include: {
      project: {
        include: {
          customer: { select: { id: true, name: true } },
        },
      },
      assignments: {
        where: {
          isActive: true,
          ...(search && {
            personnel: { name: { contains: search, mode: "insensitive" as const } },
          }),
        },
        include: {
          personnel: {
            select: { id: true, name: true, role: true, department: true, status: true },
          },
          rotationPattern: { select: { id: true, name: true } },
          allocations: {
            where: {
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            orderBy: { startDate: "asc" },
            select: { id: true, startDate: true, endDate: true, label: true, source: true },
          },
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  const customerMap = new Map<string, StaffingCustomer>();

  for (const job of jobs) {
    const customer = job.project.customer;
    if (!customerMap.has(customer.id)) {
      customerMap.set(customer.id, { id: customer.id, name: customer.name, jobs: [] });
    }

    customerMap.get(customer.id)!.jobs.push({
      id: job.id,
      name: job.name,
      location: job.location,
      status: job.status,
      type: job.type,
      startDate: job.startDate,
      endDate: job.endDate,
      resourcePlanLabelName: job.resourcePlanLabelName,
      assignments: job.assignments.map((a) => ({
        id: a.id,
        startDate: a.startDate,
        endDate: a.endDate,
        isActive: a.isActive,
        personnel: a.personnel,
        rotationPattern: a.rotationPattern,
        allocations: a.allocations,
      })),
    });
  }

  const customers = Array.from(customerMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "nb-NO")
  );

  const assignedPersonnelIds = new Set<string>();
  for (const customer of customers) {
    for (const job of customer.jobs) {
      for (const assignment of job.assignments) {
        assignedPersonnelIds.add(assignment.personnel.id);
      }
    }
  }

  const available = await db.personnel.findMany({
    where: {
      status: "ACTIVE",
      id: assignedPersonnelIds.size > 0 ? { notIn: Array.from(assignedPersonnelIds) } : undefined,
      ...(search && { name: { contains: search, mode: "insensitive" as const } }),
    },
    select: { id: true, name: true, role: true, department: true, status: true },
    orderBy: { name: "asc" },
  });

  return {
    customers,
    available,
    stats: {
      totalJobs: jobs.length,
      totalAssigned: assignedPersonnelIds.size,
      totalAvailable: available.length,
      totalCustomers: customers.length,
    },
  };
}

// ─── Legacy (kept for export, labels) ─────────────────────────

export async function getResourcePlanGrid(
  planId: string,
  startDate: Date,
  endDate: Date,
) {
  return db.resourcePlanEntry.findMany({
    where: { resourcePlanId: planId },
    include: {
      allocations: {
        where: { startDate: { lte: endDate }, endDate: { gte: startDate } },
        orderBy: { startDate: "asc" },
      },
      personnel: { select: { id: true, name: true, status: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
  });
}

export async function getResourcePlan(year: number) {
  return db.resourcePlan.findUnique({ where: { year } });
}

export async function getResourcePlanLabels(planId: string) {
  return db.resourcePlanLabel.findMany({
    where: { resourcePlanId: planId },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getOrCreateResourcePlan(year: number, userId: string, userName: string) {
  const existing = await db.resourcePlan.findUnique({ where: { year } });
  if (existing) return existing;
  return db.resourcePlan.create({
    data: { year, name: `Ressursplan ${year}`, createdById: userId, createdBy: userName },
  });
}
