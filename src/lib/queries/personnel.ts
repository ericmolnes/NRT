import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getCorporations } from "@/lib/recman/client";
import { buildCategoryWhere, type PersonnelCategory } from "@/lib/personell/category";

interface PersonnelFilters {
  search?: string;
  department?: string;
  status?: string;
  syncStatus?: string;
  /**
   * Filtrer på utledet kategori (ANSATT/INNLEID/KANDIDAT). Kombineres
   * kompositorisk med øvrige filtre slik at f.eks. `?department=X&category=ANSATT`
   * begge gjelder samtidig.
   */
  category?: PersonnelCategory;
}

export async function getPersonnelList(filters?: PersonnelFilters) {
  // Vi bygger top-level AND-listen kompositorisk slik at flere filtre kan
  // kombineres uten at ett overskriver et annet (regresjonsbug fra tidligere).
  const ANDs: Prisma.PersonnelWhereInput[] = [];

  if (filters?.search) {
    ANDs.push({ name: { contains: filters.search, mode: "insensitive" } });
  }

  // RecmanCandidate-relaterte filtre samles i én relation-where slik at
  // de kan kombineres atomisk (department + syncStatus + category).
  const recmanFilter: Prisma.RecmanCandidateWhereInput = {};
  let requireRecmanRelation = false;
  let requireUnlinked = false;

  if (filters?.department) {
    recmanFilter.corporationId = filters.department;
    requireRecmanRelation = true; // department gir bare mening når relasjonen finnes.
  }

  if (filters?.syncStatus === "po") {
    ANDs.push({ poEmployee: { isNot: null } });
  } else if (filters?.syncStatus === "recman") {
    requireRecmanRelation = true;
  } else if (filters?.syncStatus === "unlinked") {
    ANDs.push({ poEmployee: { is: null } });
    requireUnlinked = true;
  }

  // Kategorifilter har høyest spesifisitet for RecmanCandidate-relasjonen.
  // Manuelt INNLEID dekker også Personnel uten RecmanCandidate, så vi lar
  // helper-funksjonen returnere et fragment som kan AND-es inn direkte.
  if (filters?.category) {
    if (requireUnlinked && filters.category !== "INNLEID") {
      // Logisk umulig kombinasjon — unlinked betyr ingen relasjon, men
      // ANSATT/KANDIDAT krever en. Returnér tom liste.
      ANDs.push({ id: "__never__" });
    } else if (requireUnlinked) {
      // unlinked + INNLEID: behold unlinked som er. Manuell innleid er
      // allerede dekket.
    } else {
      ANDs.push(buildCategoryWhere(filters.category));
    }
  }

  // Sett sammen recman-relasjonsfilteret hvis vi har samlet noe der.
  if (requireUnlinked) {
    ANDs.push({ recmanCandidate: { is: null } });
  } else if (Object.keys(recmanFilter).length > 0 || requireRecmanRelation) {
    ANDs.push({ recmanCandidate: { is: recmanFilter } });
  }

  const where: Prisma.PersonnelWhereInput = {};
  if (ANDs.length > 0) where.AND = ANDs;

  if (filters?.status) {
    where.status = filters.status as Prisma.EnumPersonnelStatusFilter;
  } else {
    where.status = "ACTIVE";
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
        select: {
          id: true,
          lastSyncedAt: true,
          isEmployee: true,
          employeeEnd: true,
          isContractor: true,
          title: true,
          imageUrl: true,
          contractorPeriods: {
            where: { endDate: null },
            select: { id: true, startDate: true, endDate: true, company: true },
            take: 1,
          },
        },
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
      recmanCandidate: {
        include: {
          contractorPeriods: { orderBy: { startDate: "desc" } },
        },
      },
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

export type Department = { value: string; label: string };

export async function getDistinctDepartments(): Promise<Department[]> {
  const [rcCorps, corpNames] = await Promise.all([
    db.recmanCandidate.findMany({
      where: { isEmployee: true, corporationId: { not: null } },
      select: { corporationId: true },
      distinct: ["corporationId"],
    }),
    getCorporations(),
  ]);

  return rcCorps
    .filter((rc) => rc.corporationId != null)
    .map((rc) => ({
      value: rc.corporationId!,
      label: corpNames[rc.corporationId!] ?? rc.corporationId!,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "nb"));
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
