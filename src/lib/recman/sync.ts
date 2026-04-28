import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getAllCandidates } from "./client";
import {
  CANDIDATE_ALL_FIELDS,
  type RecmanCandidate,
  type RecmanCertification,
} from "./types";
import {
  findOrCreatePersonnel,
  enrichPersonnel,
} from "@/lib/personnel-matcher";
import { syncRecmanCompanies } from "./sync-companies";
import { syncRecmanProjects } from "./sync-projects";
import { syncRecmanJobs } from "./sync-jobs";
import {
  emptySyncResult,
  mergeSyncResults,
  notifySyncResult,
  type SyncQueueClient,
  type SyncResult,
} from "@/lib/sync/sync-queue";

/**
 * Full Recman sync: candidates → companies → projects → jobs
 * Order matters: companies must exist before projects, projects before jobs.
 *
 * Returnerer både per-ressurs-status og en samlet `conflicts`-blokk.
 * Konfliktdetektor er foreløpig kun aktiv for kandidater (ansatt-data);
 * andre ressurser bruker fortsatt eksisterende blind upsert. Når andre
 * sync-paths flyttes over til detector-modellen, summeres de inn her.
 */
export async function syncAllRecman(triggeredBy: string) {
  const results: Record<string, unknown> = {};
  const collectedConflicts: SyncResult[] = [];

  // 1. Sync candidates (employees)
  try {
    const cand = await syncAllCandidates(triggeredBy);
    results.candidates = cand;
    if (cand.conflicts) collectedConflicts.push(cand.conflicts);
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

  const conflicts = mergeSyncResults(collectedConflicts);

  if (conflicts.conflicts > 0 || conflicts.missingLink > 0) {
    try {
      await notifySyncResult(
        db as unknown as SyncQueueClient,
        "RECMAN",
        conflicts
      );
    } catch (err) {
      console.error("[Recman Sync] Klarte ikke opprette varsel:", err);
    }
  }

  return { ...results, conflicts };
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

    // RecmanCandidate har foreløpig ikke en lagret base-snapshot å
    // sammenligne mot, så vi skipper detektor her og returnerer et tomt
    // konfliktresultat. Når base lagres (egen kolonne eller egen logg),
    // kan denne syncen flyttes over til detector/queue-modellen på
    // samme måte som sync-employees.ts.
    return {
      total: candidates.length,
      synced,
      failed,
      conflicts: emptySyncResult(),
    };
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

/** Map Recman v2 `certification[]` to the internal course format stored in DB. */
function mapCertifications(
  certs: RecmanCertification[] | RecmanCandidate["course"]
): Prisma.InputJsonValue[] {
  if (!Array.isArray(certs) || certs.length === 0) return [];

  return certs.map((cert) => {
    // Already in old `course` format (has courseId)
    if ("courseId" in cert) return cert as unknown as Prisma.InputJsonValue;

    // New `certification` format from Recman v2
    const c = cert as RecmanCertification;
    return {
      courseId: c.certificationId,
      name: c.name,
      expiryDate: c.endDate || undefined,
      description: c.description || undefined,
      verified: false,
      files: (c.files ?? []).map((f) => ({
        fileId: String(f.candidateFileId || f.certificationFileId),
        fileName: f.name,
        url: "", // Recman v2 does not return file URLs in certification scope
      })),
    };
  });
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
    courses: mapCertifications(c.certification ?? c.course ?? []),
    relatives: c.relative ?? [],
    attributes: c.attributes ?? [],
    languages: c.language ?? [],
    driversLicense: c.driversLicense ?? [],
    references: c.reference ?? [],
    files: (c.files ?? []).map((f) => ({
      fileId: f.fileId,
      fileName: (f as Record<string, unknown>).name as string || f.fileName || "Dokument",
      url: f.url || "",
      category: f.category,
    })),
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

  // Auto-match or create Personnel for ALL synced candidates.
  // Status- og role-oppdatering basert på Recman-employee-data gjøres kun
  // for ansatte; innleide- og kandidat-status styres manuelt i NRT.
  if (!candidate.personnelId) {
    const personnelId = await findOrCreatePersonnel({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email || undefined,
      phone: c.mobilePhone || c.phone || undefined,
      role: hasEmployee ? c.title || "Ansatt" : c.title || "Kandidat",
    });

    await db.recmanCandidate.update({
      where: { id: candidate.id },
      data: { personnelId },
    });

    if (hasEmployee) {
      const targetStatus = isActive ? "ACTIVE" : "INACTIVE";
      if (targetStatus !== "ACTIVE") {
        await db.personnel.update({
          where: { id: personnelId },
          data: { status: targetStatus },
        });
      }
    }
  } else if (hasEmployee) {
    await enrichPersonnel(candidate.personnelId, {
      phone: c.mobilePhone || c.phone,
    });

    const targetStatus = isActive ? "ACTIVE" : "INACTIVE";
    const current = await db.personnel.findUnique({
      where: { id: candidate.personnelId },
      select: { status: true },
    });
    if (current && current.status !== targetStatus) {
      await db.personnel.update({
        where: { id: candidate.personnelId },
        data: { status: targetStatus },
      });
    }
  }
}
