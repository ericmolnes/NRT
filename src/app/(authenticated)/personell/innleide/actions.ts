"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
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

// ─── Toggle innleid med periodehistorikk ────────────────────────────

export async function toggleContractorWithHistory(candidateId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");

  const candidate = await db.recmanCandidate.findUnique({
    where: { id: candidateId },
    select: {
      isContractor: true,
      isEmployee: true,
      employeeEnd: true,
      firstName: true,
      lastName: true,
      email: true,
      personnelId: true,
      contractorPeriods: {
        where: { endDate: null },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });
  if (!candidate)
    return { success: false as const, error: "Kandidat ikke funnet" };

  const isCurrentEmployee =
    candidate.isEmployee && candidate.employeeEnd === null;

  if (candidate.isContractor) {
    // ─── Deaktiver: lukk aktiv periode, sett isContractor=false ────
    await db.$transaction(async (tx) => {
      // Close active period
      if (candidate.contractorPeriods.length > 0) {
        await tx.contractorPeriod.update({
          where: { id: candidate.contractorPeriods[0].id },
          data: { endDate: new Date() },
        });
      }

      // Set isContractor=false
      await tx.recmanCandidate.update({
        where: { id: candidateId },
        data: { isContractor: false },
      });

      // Keep ACTIVE if they're still an internal employee loaned out briefly.
      if (candidate.personnelId && !isCurrentEmployee) {
        await tx.personnel.update({
          where: { id: candidate.personnelId },
          data: { status: "INACTIVE" },
        });
      } else if (candidate.personnelId && isCurrentEmployee) {
        await tx.personnel.update({
          where: { id: candidate.personnelId },
          data: { role: "Ansatt" },
        });
      }
    });

    console.log(
      `[NRT] deactivated contractor ${candidateId} (${candidate.firstName} ${candidate.lastName})`
    );
  } else {
    // ─── Aktiver: opprett ny periode, sett isContractor=true ───────
    await db.$transaction(async (tx) => {
      // Guard: skip if already has an active period (prevents double-click duplicates)
      const existingActive = await tx.contractorPeriod.findFirst({
        where: { recmanCandidateId: candidateId, endDate: null },
      });
      if (!existingActive) {
        await tx.contractorPeriod.create({
          data: {
            recmanCandidateId: candidateId,
            startDate: new Date(),
            company: null,
          },
        });
      }

      // Set isContractor=true
      await tx.recmanCandidate.update({
        where: { id: candidateId },
        data: { isContractor: true },
      });

      // Find or create Personnel with role="Innleid"
      if (candidate.personnelId) {
        // Already linked — reactivate
        await tx.personnel.update({
          where: { id: candidate.personnelId },
          data: { status: "ACTIVE", role: "Innleid" },
        });
      } else {
        // Create new Personnel record
        const personnel = await tx.personnel.create({
          data: {
            name: `${candidate.firstName} ${candidate.lastName}`,
            email: candidate.email,
            role: "Innleid",
            status: "ACTIVE",
          },
        });

        // Link candidate to personnel
        await tx.recmanCandidate.update({
          where: { id: candidateId },
          data: { personnelId: personnel.id },
        });
      }
    });

    console.log(
      `[NRT] activated contractor ${candidateId} (${candidate.firstName} ${candidate.lastName})`
    );
  }

  revalidatePath("/personell/innleide");
  revalidatePath("/personell/kandidater");
  revalidatePath("/personell");
  return {
    success: true as const,
    isContractor: !candidate.isContractor,
  };
}

// ─── Fjern innleid-status helt ──────────────────────────────────────

export async function removeContractorStatus(candidateId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");

  const candidate = await db.recmanCandidate.findUnique({
    where: { id: candidateId },
    select: {
      contractorPeriods: {
        where: { endDate: null },
      },
    },
  });
  if (!candidate)
    return { success: false as const, error: "Kandidat ikke funnet" };

  await db.$transaction(async (tx) => {
    // Close all active periods
    for (const period of candidate.contractorPeriods) {
      await tx.contractorPeriod.update({
        where: { id: period.id },
        data: { endDate: new Date() },
      });
    }

    // Set isContractor=false
    await tx.recmanCandidate.update({
      where: { id: candidateId },
      data: { isContractor: false },
    });
  });

  console.log(`[NRT] removed contractor status for ${candidateId}`);

  revalidatePath("/personell/innleide");
  revalidatePath("/personell/kandidater");
  revalidatePath("/personell");
  return { success: true as const };
}
