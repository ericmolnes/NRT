"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type Prisma } from "@/generated/prisma/client";
import { SKILL_CATEGORIES } from "@/lib/recman/types";
import { transitionCategory } from "@/lib/personell/transition-category";

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

// ─── Toggle innleid med periodehistorikk ────────────────────────────
//
// Bakoverkompatibel shim. Hele overgangslogikken — periode, isContractor,
// Personnel-rad og ChangeLog — bor nå i `transitionCategory`. Denne
// wrapperen beholdes for å unngå å bryte alle eksisterende UI-kall i samme
// commit.

export async function toggleContractorWithHistory(candidateId: string) {
  const candidate = await db.recmanCandidate.findUnique({
    where: { id: candidateId },
    select: { isContractor: true, contractorPeriods: { where: { endDate: null }, take: 1 } },
  });
  if (!candidate)
    return { success: false as const, error: "Kandidat ikke funnet" };

  const isCurrentlyContractor =
    candidate.isContractor || candidate.contractorPeriods.length > 0;
  const target = isCurrentlyContractor ? "KANDIDAT" : "INNLEID";

  const result = await transitionCategory({ recmanCandidateId: candidateId }, target);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }

  revalidatePath("/personell/innleide");
  revalidatePath("/personell/kandidater");
  revalidatePath("/personell");

  return {
    success: true as const,
    isContractor: target === "INNLEID",
  };
}

// ─── Fjern innleid-status helt ──────────────────────────────────────
//
// Bakoverkompatibel shim — delegerer til `transitionCategory`. Lukker åpne
// perioder og fjerner `isContractor` flagget i én transaksjon med
// endringslogg.

export async function removeContractorStatus(candidateId: string) {
  const result = await transitionCategory({ recmanCandidateId: candidateId }, "KANDIDAT");
  if (!result.success) return { success: false as const, error: result.error };

  revalidatePath("/personell/innleide");
  revalidatePath("/personell/kandidater");
  revalidatePath("/personell");
  return { success: true as const };
}
