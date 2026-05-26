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
  processSyncDiagnosis,
  type SyncQueueClient,
  type SyncResult,
} from "@/lib/sync/sync-queue";
import {
  countFailedRecords,
  getSyncLogStatus,
  hasSyncRunFailures,
} from "@/lib/sync/sync-run-status";
import {
  buildRecmanCandidateSyncPlan,
  deriveRecmanCandidateEmployeeState,
  parseRecmanDate,
  serializeRecmanCandidateBase,
  shouldEnsurePersonnelForRecmanCandidate,
  type RecmanCandidateSyncShape,
} from "./candidate-sync";

/**
 * Full Recman sync: candidates → companies → projects → jobs
 * Order matters: companies must exist before projects, projects before jobs.
 *
 * Returnerer både per-ressurs-status og en samlet `conflicts`-blokk.
 * Konfliktdetektor er foreløpig kun aktiv for kandidater (ansatt-data);
 * andre ressurser bruker fortsatt eksisterende blind upsert. Når andre
 * sync-paths flyttes over til detector-modellen, summeres de inn her.
 */
type RecmanSyncResource = "candidates" | "companies" | "projects" | "jobs";

export type RecmanSyncRunError = {
  resource: RecmanSyncResource;
  message: string;
};

function toSyncRunError(
  resource: RecmanSyncResource,
  error: unknown
): RecmanSyncRunError {
  return {
    resource,
    message: error instanceof Error ? error.message : String(error),
  };
}

export async function syncAllRecman(triggeredBy: string) {
  const results: Record<string, unknown> = {};
  const collectedConflicts: SyncResult[] = [];
  const errors: RecmanSyncRunError[] = [];

  // 1. Sync candidates (employees)
  try {
    const cand = await syncAllCandidates(triggeredBy);
    results.candidates = cand;
    if (cand.conflicts) collectedConflicts.push(cand.conflicts);
  } catch (e) {
    const error = toSyncRunError("candidates", e);
    results.candidates = { error: error.message };
    errors.push(error);
  }

  // 2. Sync companies → NRT customers
  try {
    results.companies = await syncRecmanCompanies(triggeredBy);
  } catch (e) {
    const error = toSyncRunError("companies", e);
    results.companies = { error: error.message };
    errors.push(error);
  }

  // 3. Sync projects → NRT projects
  try {
    results.projects = await syncRecmanProjects(triggeredBy);
  } catch (e) {
    const error = toSyncRunError("projects", e);
    results.projects = { error: error.message };
    errors.push(error);
  }

  // 4. Sync jobs → NRT job assignments + resource plan
  try {
    results.jobs = await syncRecmanJobs(triggeredBy);
  } catch (e) {
    const error = toSyncRunError("jobs", e);
    results.jobs = { error: error.message };
    errors.push(error);
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

  const failedRecords = countFailedRecords(results);

  return {
    ...results,
    conflicts,
    errors,
    failedRecords,
    ok: !hasSyncRunFailures({ ...results, errors }),
  };
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
    const perRecord: SyncResult[] = [];

    for (const c of candidates) {
      try {
        perRecord.push(await upsertCandidate(c));
        synced++;
      } catch (e) {
        console.error(`Feil ved synk av ${c.firstName} ${c.lastName}:`, e);
        failed++;
      }
    }

    const status = getSyncLogStatus(failed);
    const seenRecmanIds = candidates.map((candidate) => candidate.candidateId);
    const missingRemoteWhere = seenRecmanIds.length
      ? { recmanId: { notIn: seenRecmanIds } }
      : {};
    const missingRemote = await db.recmanCandidate.count({
      where: missingRemoteWhere,
    });

    await db.recmanSyncLog.update({
      where: { id: log.id },
      data: {
        status,
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
      status,
      missingRemote,
      conflicts: mergeSyncResults(perRecord),
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

const RECMAN_CANDIDATE_SYNC_SELECT = {
  id: true,
  personnelId: true,
  rawJson: true,
  corporationId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  mobilePhone: true,
  address: true,
  postalCode: true,
  postalPlace: true,
  city: true,
  country: true,
  nationality: true,
  gender: true,
  dob: true,
  title: true,
  description: true,
  rating: true,
  imageUrl: true,
  linkedIn: true,
  isEmployee: true,
  employeeNumber: true,
  employeeStart: true,
  employeeEnd: true,
  skills: true,
  education: true,
  experience: true,
  projectExperience: true,
  courses: true,
  relatives: true,
  attributes: true,
  languages: true,
  driversLicense: true,
  references: true,
  files: true,
  recmanCreated: true,
  recmanUpdated: true,
} satisfies Prisma.RecmanCandidateSelect;

const RECMAN_CANDIDATE_AFTER_SYNC_SELECT = {
  id: true,
  personnelId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  mobilePhone: true,
  title: true,
  isEmployee: true,
  employeeEnd: true,
} satisfies Prisma.RecmanCandidateSelect;

type RecmanCandidateSyncRow = {
  id: string;
  personnelId: string | null;
  rawJson: string | null;
} & RecmanCandidateSyncShape;

function toCandidateSyncShape(
  row: RecmanCandidateSyncRow
): RecmanCandidateSyncShape {
  const shape: RecmanCandidateSyncShape = { ...row };
  delete shape["id"];
  delete shape["personnelId"];
  delete shape["rawJson"];
  return shape;
}

async function upsertCandidate(c: RecmanCandidate): Promise<SyncResult> {
  const employee =
    typeof c.employee === "object" && c.employee !== null ? c.employee : null;
  const employeeStart = parseRecmanDate(employee?.startDate);
  const employeeEnd = parseRecmanDate(employee?.endDate);
  const hasEmployee = employeeStart !== null;
  const isActive = hasEmployee && employeeEnd === null;

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
    dob: parseRecmanDate(c.dob),
    title: c.title || null,
    description: c.description || null,
    rating: c.rating ? parseInt(c.rating, 10) : 0,
    imageUrl: c.image || null,
    linkedIn: c.linkedIn || null,
    isEmployee: hasEmployee,
    employeeNumber: employee?.number ?? null,
    employeeStart,
    employeeEnd: isActive ? null : employeeEnd,
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
    recmanCreated: parseRecmanDate(c.created),
    recmanUpdated: parseRecmanDate(c.updated),
  };

  const existing = await db.recmanCandidate.findUnique({
    where: { recmanId: c.candidateId },
    select: RECMAN_CANDIDATE_SYNC_SELECT,
  });
  const previousEmployeeState = existing
    ? { wasEmployee: existing.isEmployee }
    : undefined;

  const now = new Date();
  let syncResult = emptySyncResult();
  let candidate: {
    id: string;
    personnelId: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    mobilePhone: string | null;
    title: string | null;
    isEmployee: boolean;
    employeeEnd: Date | null;
  };

  if (!existing) {
    candidate = await db.recmanCandidate.create({
      data: {
        recmanId: c.candidateId,
        ...candidateData,
        rawJson: serializeRecmanCandidateBase(candidateData),
        lastSyncedAt: now,
      },
      select: RECMAN_CANDIDATE_AFTER_SYNC_SELECT,
    });
    syncResult.applied = 1;
  } else {
    const syncPlan = buildRecmanCandidateSyncPlan({
      local: toCandidateSyncShape(existing as unknown as RecmanCandidateSyncRow),
      remote: candidateData,
      baseRawJson: existing.rawJson,
    });
    const safeFieldUpdates: Record<string, unknown> = {};

    syncResult = await processSyncDiagnosis(db as unknown as SyncQueueClient, {
      source: "RECMAN",
      model: "RecmanCandidate",
      recordId: existing.id,
      diagnosis: syncPlan.diagnosis,
      applyChange: async (field, value) => {
        safeFieldUpdates[field] = value;
      },
    });

    const updateData: Record<string, unknown> = {
      ...safeFieldUpdates,
      lastSyncedAt: now,
    };
    if (syncPlan.nextBaseRawJson !== null) {
      updateData.rawJson = syncPlan.nextBaseRawJson;
    }

    candidate = await db.recmanCandidate.update({
      where: { id: existing.id },
      data: updateData,
      select: RECMAN_CANDIDATE_AFTER_SYNC_SELECT,
    });
  }

  const employeeState = deriveRecmanCandidateEmployeeState(
    candidate,
    previousEmployeeState
  );

  // Auto-match or create Personnel for synced employees.
  // Status- og role-oppdatering basert på Recman-employee-data gjøres kun
  // for ansatte; innleide- og kandidat-status styres manuelt i NRT.
  if (
    !candidate.personnelId &&
    shouldEnsurePersonnelForRecmanCandidate(employeeState)
  ) {
    const personnelId = await findOrCreatePersonnel({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email || undefined,
      phone: candidate.mobilePhone || candidate.phone || undefined,
      role: candidate.title || "Ansatt",
    });

    await db.recmanCandidate.update({
      where: { id: candidate.id },
      data: { personnelId },
    });

    if (employeeState.targetStatus) {
      if (employeeState.targetStatus !== "ACTIVE") {
        await db.personnel.update({
          where: { id: personnelId },
          data: { status: employeeState.targetStatus },
        });
      }
    }
  } else if (candidate.personnelId && employeeState.targetStatus) {
    await enrichPersonnel(candidate.personnelId, {
      phone: candidate.mobilePhone || candidate.phone,
    });

    const current = await db.personnel.findUnique({
      where: { id: candidate.personnelId },
      select: { status: true },
    });
    if (current && current.status !== employeeState.targetStatus) {
      await db.personnel.update({
        where: { id: candidate.personnelId },
        data: { status: employeeState.targetStatus },
      });
    }
  }

  return syncResult;
}
