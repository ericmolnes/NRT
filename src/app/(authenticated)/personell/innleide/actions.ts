"use server";

import { db } from "@/lib/db";
import { type Prisma } from "@/generated/prisma/client";
import { SKILL_CATEGORIES } from "@/lib/recman/types";

// ─── Søk innleide ───────────────────────────────────────────────────

type SearchParams = {
  q?: string;
  skill?: string;
  city?: string;
  company?: string;
  minRating?: string;
  license?: string;
  language?: string;
  page?: string;
};

export async function searchContractors(params: SearchParams) {
  const page = parseInt(params.page || "1", 10);
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  const where: Prisma.RecmanCandidateWhereInput = {
    isContractor: true,
  };
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

  // Skill-søk (søker i JSON skills-array)
  if (params.skill) {
    const categoryKey = params.skill as keyof typeof SKILL_CATEGORIES;
    const keywords = SKILL_CATEGORIES[categoryKey];

    if (keywords) {
      AND.push({
        OR: keywords.map(
          (kw) =>
            ({
              skills: {
                path: [],
                array_contains: [] as never[],
                string_contains: kw,
              },
            }) as unknown as Prisma.RecmanCandidateWhereInput
        ),
      });
    }
  }

  // By-filter
  if (params.city) {
    AND.push({ city: { contains: params.city, mode: "insensitive" } });
  }

  // Bedrift-filter (søker i ContractorPeriod.company)
  if (params.company) {
    AND.push({
      contractorPeriods: {
        some: {
          company: { contains: params.company, mode: "insensitive" },
        },
      },
    });
  }

  // Rating-filter
  if (params.minRating) {
    AND.push({ rating: { gte: parseInt(params.minRating, 10) } });
  }

  if (AND.length > 0) {
    where.AND = AND;
  }

  const [contractors, total] = await Promise.all([
    db.recmanCandidate.findMany({
      where,
      include: {
        contractorPeriods: {
          orderBy: { startDate: "desc" },
        },
        personnel: {
          select: {
            id: true,
            evaluations: { select: { score: true } },
          },
        },
      },
      orderBy: [{ lastName: "asc" }],
      take: pageSize,
      skip,
    }),
    db.recmanCandidate.count({ where }),
  ]);

  // Post-filter for skills (JSON search in application code)
  let filtered = contractors;
  if (params.skill) {
    const categoryKey = params.skill as keyof typeof SKILL_CATEGORIES;
    const keywords = SKILL_CATEGORIES[categoryKey];
    const searchTerms = keywords || [params.skill.toLowerCase()];

    filtered = contractors.filter((c) => {
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
    contractors: filtered,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page,
  };
}

// ─── Statistikk for innleide ────────────────────────────────────────

export async function getContractorStats() {
  const [total, active, former, withSkills, withEvaluations] = await Promise.all([
    db.recmanCandidate.count({ where: { isContractor: true } }),
    db.recmanCandidate.count({
      where: {
        isContractor: true,
        contractorPeriods: { some: { endDate: null } },
      },
    }),
    db.recmanCandidate.count({
      where: {
        isContractor: false,
        contractorPeriods: { some: {} },
      },
    }),
    db.recmanCandidate.count({
      where: {
        isContractor: true,
        skills: { not: { equals: [] } },
      },
    }),
    db.recmanCandidate.count({
      where: {
        isContractor: true,
        personnel: { evaluations: { some: {} } },
      },
    }),
  ]);

  return { total, active, former, withSkills, withEvaluations };
}

// Kategoriovergang gjøres nå via `transitionPersonnelCategory` i
// `personell/actions.ts` — kalleren spesifiserer eksplisitt target-kategori
// ("INNLEID" eller "KANDIDAT") i stedet for å gå via en toggle-shim.
