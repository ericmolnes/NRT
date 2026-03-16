"use server";

import { auth } from "@/lib/auth";
import { assertAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { syncAllCandidates, syncAllRecman } from "@/lib/recman/sync";
import { revalidatePath } from "next/cache";
import { type Prisma } from "@/generated/prisma/client";
import { SKILL_CATEGORIES } from "@/lib/recman/types";

// ─── Synkronisering ─────────────────────────────────────────────────

export async function triggerRecmanSync() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");

  const result = await syncAllRecman(session.user.id);
  revalidatePath("/personell");
  revalidatePath("/kunder");
  revalidatePath("/prosjekter");
  revalidatePath("/jobber");
  revalidatePath("/ressursplan");
  revalidatePath("/settings");
  return result;
}

export async function getLastSync() {
  return db.recmanSyncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });
}

// ─── Søk og filtrering ──────────────────────────────────────────────

type SearchParams = {
  q?: string;
  filter?: string; // "all" | "employees" | "active" | "candidates"
  skill?: string;
  city?: string;
  minRating?: string;
  license?: string;
  language?: string;
  page?: string;
};

export async function searchCandidates(params: SearchParams) {
  const page = parseInt(params.page || "1", 10);
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  const where: Prisma.RecmanCandidateWhereInput = {};
  const AND: Prisma.RecmanCandidateWhereInput[] = [];

  // Tekstsøk (navn, tittel, email)
  if (params.q) {
    AND.push({
      OR: [
        { firstName: { contains: params.q, mode: "insensitive" } },
        { lastName: { contains: params.q, mode: "insensitive" } },
        { title: { contains: params.q, mode: "insensitive" } },
        { email: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }

  // Ansatt-filter
  if (params.filter === "employees") {
    AND.push({ isEmployee: true });
  } else if (params.filter === "active") {
    AND.push({ isEmployee: true, employeeEnd: null });
  } else if (params.filter === "candidates") {
    AND.push({ isEmployee: false });
  }

  // Skill-søk (søker i JSON skills-array)
  if (params.skill) {
    // Sjekk om det er en kategori-nøkkel
    const categoryKey = params.skill as keyof typeof SKILL_CATEGORIES;
    const keywords = SKILL_CATEGORIES[categoryKey];

    if (keywords) {
      // Søk på alle keywords i kategorien
      AND.push({
        OR: keywords.map((kw) => ({
          skills: { path: [], array_contains: [] as never[], string_contains: kw },
        } as unknown as Prisma.RecmanCandidateWhereInput)),
      });
    }
    // Fallback: Raw SQL for JSON search since Prisma JSON filtering is limited
    // We'll filter in application code instead
  }

  // By-filter
  if (params.city) {
    AND.push({ city: { contains: params.city, mode: "insensitive" } });
  }

  // Rating-filter
  if (params.minRating) {
    AND.push({ rating: { gte: parseInt(params.minRating, 10) } });
  }

  if (AND.length > 0) {
    where.AND = AND;
  }

  const [candidates, total] = await Promise.all([
    db.recmanCandidate.findMany({
      where,
      orderBy: [{ isEmployee: "desc" }, { lastName: "asc" }],
      take: pageSize,
      skip,
    }),
    db.recmanCandidate.count({ where }),
  ]);

  // Post-filter for skills (JSON search in application code)
  let filtered = candidates;
  if (params.skill) {
    const categoryKey = params.skill as keyof typeof SKILL_CATEGORIES;
    const keywords = SKILL_CATEGORIES[categoryKey];
    const searchTerms = keywords || [params.skill.toLowerCase()];

    filtered = candidates.filter((c) => {
      const skills = (c.skills as Array<{ name: string }>) || [];
      return skills.some((s) =>
        searchTerms.some((kw) => s.name.toLowerCase().includes(kw))
      );
    });
  }

  // Post-filter for drivers license
  if (params.license) {
    filtered = filtered.filter((c) => {
      const licenses = (c.driversLicense as string[]) || [];
      return licenses.includes(params.license!);
    });
  }

  // Post-filter for language
  if (params.language) {
    filtered = filtered.filter((c) => {
      const langs = (c.languages as Array<{ name: string }>) || [];
      return langs.some((l) =>
        l.name.toLowerCase().includes(params.language!.toLowerCase())
      );
    });
  }

  return {
    candidates: filtered,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page,
  };
}

// ─── Kandidat-detalj ────────────────────────────────────────────────

export async function getCandidateDetail(id: string) {
  return db.recmanCandidate.findUnique({
    where: { id },
    include: { personnel: true },
  });
}

// ─── Koble til Personnel ────────────────────────────────────────────

export async function linkToPersonnel(recmanCandidateId: string, personnelId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  await assertAdmin();

  await db.recmanCandidate.update({
    where: { id: recmanCandidateId },
    data: { personnelId },
  });

  revalidatePath("/recman");
}

export async function unlinkPersonnel(recmanCandidateId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  await assertAdmin();

  await db.recmanCandidate.update({
    where: { id: recmanCandidateId },
    data: { personnelId: null },
  });

  revalidatePath("/recman");
}

// ─── Kompetanseoversikt ─────────────────────────────────────────────

export async function getSkillsOverview(employeesOnly: boolean = false) {
  const where: Prisma.RecmanCandidateWhereInput = employeesOnly
    ? { isEmployee: true, employeeEnd: null }
    : {};

  const candidates = await db.recmanCandidate.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      isEmployee: true,
      skills: true,
    },
  });

  // Bygg skill-oversikt per kategori
  const overview: Record<string, Array<{
    id: string;
    name: string;
    title: string | null;
    isEmployee: boolean;
    matchingSkills: string[];
  }>> = {};

  for (const [category, keywords] of Object.entries(SKILL_CATEGORIES)) {
    overview[category] = [];
    for (const c of candidates) {
      const skills = (c.skills as Array<{ name: string }>) || [];
      const matching = skills.filter((s) =>
        keywords.some((kw) => s.name.toLowerCase().includes(kw))
      );
      if (matching.length > 0) {
        overview[category].push({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          title: c.title,
          isEmployee: c.isEmployee,
          matchingSkills: matching.map((s) => s.name),
        });
      }
    }
  }

  // Alle unike skills med antall
  const allSkills = new Map<string, number>();
  for (const c of candidates) {
    const skills = (c.skills as Array<{ name: string }>) || [];
    for (const s of skills) {
      allSkills.set(s.name, (allSkills.get(s.name) || 0) + 1);
    }
  }

  return {
    overview,
    allSkills: [...allSkills.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    totalCandidates: candidates.length,
  };
}
