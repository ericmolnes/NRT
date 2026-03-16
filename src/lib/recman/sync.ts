import { db } from "@/lib/db";
import { getAllCandidates } from "./client";
import { CANDIDATE_ALL_FIELDS, type RecmanCandidate } from "./types";
import {
  findOrCreatePersonnel,
  enrichPersonnel,
} from "@/lib/personnel-matcher";
import { syncRecmanCompanies } from "./sync-companies";
import { syncRecmanProjects } from "./sync-projects";
import { syncRecmanJobs } from "./sync-jobs";

/**
 * Full Recman sync: candidates → companies → projects → jobs
 * Order matters: companies must exist before projects, projects before jobs.
 */
export async function syncAllRecman(triggeredBy: string) {
  const results: Record<string, unknown> = {};

  // 1. Sync candidates (employees)
  try {
    results.candidates = await syncAllCandidates(triggeredBy);
  } catch (e) {
    results.candidates = { error: e instanceof Error ? e.message : String(e) };
  }

  // 2. Sync companies → NRT customers
  try {
    results.companies = await syncRecmanCompanies(triggeredBy);
  } catch (e) {
    results.companies = { error: e instanceof Error ? e.message : String(e) };
  }

  // 3. Sync projects → NRT projects
  try {
    results.projects = await syncRecmanProjects(triggeredBy);
  } catch (e) {
    results.projects = { error: e instanceof Error ? e.message : String(e) };
  }

  // 4. Sync jobs → NRT job assignments + resource plan
  try {
    results.jobs = await syncRecmanJobs(triggeredBy);
  } catch (e) {
    results.jobs = { error: e instanceof Error ? e.message : String(e) };
  }

  return results;
}

export async function syncAllCandidates(triggeredBy: string) {
  const log = await db.recmanSyncLog.create({
    data: {
      direction: "pull",
      status: "running",
      triggeredBy,
    },
  });

  try {
    const candidates = await getAllCandidates(CANDIDATE_ALL_FIELDS);
    let synced = 0;
    let failed = 0;

    for (const c of candidates) {
      try {
        await upsertCandidate(c);
        synced++;
      } catch (e) {
        console.error(`Feil ved synk av ${c.firstName} ${c.lastName}:`, e);
        failed++;
      }
    }

    await db.recmanSyncLog.update({
      where: { id: log.id },
      data: {
        status: "completed",
        recordsTotal: candidates.length,
        recordsSynced: synced,
        recordsFailed: failed,
        completedAt: new Date(),
      },
    });

    return { total: candidates.length, synced, failed };
  } catch (e) {
    await db.recmanSyncLog.update({
      where: { id: log.id },
      data: {
        status: "failed",
        errorMessage: e instanceof Error ? e.message : String(e),
        completedAt: new Date(),
      },
    });
    throw e;
  }
}

async function upsertCandidate(c: RecmanCandidate) {
  const hasEmployee = !!c.employee?.startDate;
  const isActive = hasEmployee && !c.employee?.endDate;

  const candidateData = {
    corporationId: c.corporationId,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email || null,
    phone: c.phone || c.mobilePhone || null,
    mobilePhone: c.mobilePhone || null,
    address: c.address || null,
    postalCode: c.postalCode || null,
    postalPlace: c.postalPlace || null,
    city: c.city || null,
    country: c.country || null,
    nationality: c.nationality || null,
    gender: c.gender || null,
    dob: c.dob ? new Date(c.dob) : null,
    title: c.title || null,
    description: c.description || null,
    rating: c.rating ? parseInt(c.rating, 10) : 0,
    imageUrl: c.image || null,
    linkedIn: c.linkedIn || null,
    isEmployee: hasEmployee,
    employeeNumber: c.employee?.number ?? null,
    employeeStart: c.employee?.startDate
      ? new Date(c.employee.startDate)
      : null,
    employeeEnd: isActive
      ? null
      : c.employee?.endDate
        ? new Date(c.employee.endDate)
        : null,
    skills: c.skills ?? [],
    education: c.education ?? [],
    experience: c.experience ?? [],
    projectExperience: c.projectExperience ?? [],
    courses: c.course ?? [],
    relatives: c.relative ?? [],
    attributes: c.attributes ?? [],
    languages: c.language ?? [],
    driversLicense: c.driversLicense ?? [],
    references: c.reference ?? [],
    files: c.files ?? [],
    recmanCreated: c.created ? new Date(c.created) : null,
    recmanUpdated: c.updated ? new Date(c.updated) : null,
    lastSyncedAt: new Date(),
  };

  const candidate = await db.recmanCandidate.upsert({
    where: { recmanId: c.candidateId },
    create: {
      recmanId: c.candidateId,
      ...candidateData,
    },
    update: candidateData,
    select: { id: true, personnelId: true },
  });

  // Auto-match or create Personnel for employees only
  if (hasEmployee) {
    if (!candidate.personnelId) {
      const personnelId = await findOrCreatePersonnel({
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email || undefined,
        phone: c.mobilePhone || c.phone || undefined,
        role: c.title || "Ansatt",
      });

      await db.recmanCandidate.update({
        where: { id: candidate.id },
        data: { personnelId },
      });
    } else {
      await enrichPersonnel(candidate.personnelId, {
        phone: c.mobilePhone || c.phone,
      });
    }
  }
}
