// Kategori-bevisst overgang for personelldomenet.
//
// Erstatter de eldre `toggleContractor`/`toggleContractorWithHistory`-flytene
// med én helhetlig overgang mellom KANDIDAT og INNLEID. ANSATT-kategorien
// styres alltid av RecMan-employee-data og kan ikke flyttes til manuelt.
//
// Hver overgang:
//   1. Slår opp gjeldende tilstand (Personnel + RecmanCandidate + åpen periode)
//   2. Beregner gjeldende kategori med `resolveCategory`
//   3. Validerer at overgangen er lovlig
//   4. Utfører relaterte sideeffekter atomisk i en `$transaction`:
//      - Lukker eksisterende åpen ContractorPeriod ved utgang fra INNLEID
//      - Oppretter ny ContractorPeriod ved inngang til INNLEID
//      - Oppdaterer `isContractor`-flagget på RecmanCandidate
//      - Oppretter Personnel-rad hvis den ikke finnes
//   5. Logger endringen via ChangeLog/ChangeLogEntry i samme transaksjon

"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { resolveCategory, type PersonnelCategory } from "./category";

type CategoryRef = {
  personnelId?: string;
  recmanCandidateId?: string;
};

type TransitionOptions = {
  company?: string | null;
  notes?: string | null;
};

export type TransitionResult =
  | {
      success: true;
      from: PersonnelCategory;
      to: PersonnelCategory;
      personnelId: string | null;
      recmanCandidateId: string | null;
    }
  | { success: false; error: string };

/**
 * Flytt en person mellom kategorier (KANDIDAT ↔ INNLEID). ANSATT styres av
 * RecMan og kan ikke nås manuelt — forsøk på å sette `to: "ANSATT"` returnerer
 * en feil. Logger endringen i ChangeLog atomisk med selve datatransaksjonen.
 */
export async function transitionCategory(
  ref: CategoryRef,
  to: PersonnelCategory,
  options: TransitionOptions = {}
): Promise<TransitionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Ikke autentisert" };
  }
  const actorId = session.user.id;
  const actorName = session.user.name ?? null;

  if (!ref.personnelId && !ref.recmanCandidateId) {
    return {
      success: false,
      error: "Trenger enten personnelId eller recmanCandidateId",
    };
  }

  // ─── Slå opp gjeldende tilstand ──────────────────────────────────
  const candidate = ref.recmanCandidateId
    ? await db.recmanCandidate.findUnique({
        where: { id: ref.recmanCandidateId },
        include: {
          contractorPeriods: {
            where: { endDate: null },
            orderBy: { startDate: "desc" },
            take: 1,
          },
        },
      })
    : ref.personnelId
      ? await db.recmanCandidate.findFirst({
          where: { personnelId: ref.personnelId },
          include: {
            contractorPeriods: {
              where: { endDate: null },
              orderBy: { startDate: "desc" },
              take: 1,
            },
          },
        })
      : null;

  const personnel = ref.personnelId
    ? await db.personnel.findUnique({ where: { id: ref.personnelId } })
    : candidate?.personnelId
      ? await db.personnel.findUnique({ where: { id: candidate.personnelId } })
      : null;

  if (!candidate && !personnel) {
    return { success: false, error: "Person ikke funnet" };
  }

  // ─── Beregn nåværende kategori ───────────────────────────────────
  const from = resolveCategory({
    recmanCandidate: candidate
      ? {
          isEmployee: candidate.isEmployee,
          employeeEnd: candidate.employeeEnd,
          isContractor: candidate.isContractor,
        }
      : null,
    hasOpenContractorPeriod: (candidate?.contractorPeriods?.length ?? 0) > 0,
    isManualPersonnel: !!personnel && !candidate,
  });

  if (from === to) {
    return {
      success: true,
      from,
      to,
      personnelId: personnel?.id ?? candidate?.personnelId ?? null,
      recmanCandidateId: candidate?.id ?? null,
    };
  }

  // ─── Valider overgang ────────────────────────────────────────────
  if (to === "ANSATT") {
    return {
      success: false,
      error:
        "ANSATT-kategori styres av RecMan-employee-data og kan ikke settes manuelt",
    };
  }
  if (from === "ANSATT") {
    return {
      success: false,
      error: "Kan ikke flytte aktiv ansatt manuelt — endre i RecMan først",
    };
  }

  // ─── Utfør overgang og logg atomisk ──────────────────────────────
  try {
    const result = await db.$transaction(async (tx) => {
      let personnelId = personnel?.id ?? candidate?.personnelId ?? null;
      const recmanCandidateId = candidate?.id ?? null;
      const personnelChanges: Array<{
        field: string;
        oldValue: unknown;
        newValue: unknown;
      }> = [];
      const candidateChanges: Array<{
        field: string;
        oldValue: unknown;
        newValue: unknown;
      }> = [];
      const periodChanges: Array<{
        recordId: string;
        field: string;
        oldValue: unknown;
        newValue: unknown;
      }> = [];

      // 1. Forlater INNLEID → lukk åpen periode (om noen).
      if (from === "INNLEID" && candidate?.contractorPeriods?.length) {
        const period = candidate.contractorPeriods[0];
        await tx.contractorPeriod.update({
          where: { id: period.id },
          data: { endDate: new Date() },
        });
        periodChanges.push({
          recordId: period.id,
          field: "endDate",
          oldValue: null,
          newValue: new Date().toISOString(),
        });
      }

      // 2. Går inn i INNLEID → åpne ny periode (kun hvis recman finnes), sett flag.
      if (to === "INNLEID" && candidate) {
        // Idempotent: ikke opprett duplikat hvis det allerede finnes en åpen.
        const existing = await tx.contractorPeriod.findFirst({
          where: { recmanCandidateId: candidate.id, endDate: null },
        });
        if (!existing) {
          const created = await tx.contractorPeriod.create({
            data: {
              recmanCandidateId: candidate.id,
              startDate: new Date(),
              company: options.company ?? null,
              notes: options.notes ?? null,
            },
          });
          periodChanges.push({
            recordId: created.id,
            field: "startDate",
            oldValue: null,
            newValue: created.startDate.toISOString(),
          });
        }
      }

      // 3. Oppdater isContractor-flagget på RecmanCandidate.
      if (candidate) {
        const desired = to === "INNLEID";
        if (candidate.isContractor !== desired) {
          await tx.recmanCandidate.update({
            where: { id: candidate.id },
            data: { isContractor: desired },
          });
          candidateChanges.push({
            field: "isContractor",
            oldValue: candidate.isContractor,
            newValue: desired,
          });
        }
      }

      // 4. Sørg for at en Personnel-rad finnes når personen blir innleid.
      if (to === "INNLEID" && !personnelId && candidate) {
        const created = await tx.personnel.create({
          data: {
            name: `${candidate.firstName} ${candidate.lastName}`.trim(),
            email: candidate.email,
            role: "Innleid",
            status: "ACTIVE",
          },
        });
        personnelId = created.id;
        await tx.recmanCandidate.update({
          where: { id: candidate.id },
          data: { personnelId: created.id },
        });
        personnelChanges.push(
          { field: "id", oldValue: null, newValue: created.id },
          { field: "role", oldValue: null, newValue: "Innleid" },
          { field: "status", oldValue: null, newValue: "ACTIVE" }
        );
      } else if (to === "INNLEID" && personnelId) {
        // Reaktiver eksisterende rad.
        const existing = await tx.personnel.findUnique({
          where: { id: personnelId },
        });
        if (existing && (existing.status !== "ACTIVE" || existing.role !== "Innleid")) {
          await tx.personnel.update({
            where: { id: personnelId },
            data: { status: "ACTIVE", role: "Innleid" },
          });
          if (existing.status !== "ACTIVE") {
            personnelChanges.push({
              field: "status",
              oldValue: existing.status,
              newValue: "ACTIVE",
            });
          }
          if (existing.role !== "Innleid") {
            personnelChanges.push({
              field: "role",
              oldValue: existing.role,
              newValue: "Innleid",
            });
          }
        }
      }

      // ─── Logg endringen som én ChangeLog med flere entries ──────
      const log = await tx.changeLog.create({
        data: {
          actorType: "USER",
          actorId,
          actorName,
          source: "USER_ACTION",
          summary: `Endret kategori ${from} → ${to}`,
        },
      });

      // Hovedendring: kategori (logisk felt på Personnel/RecmanCandidate).
      const categoryEntries: Prisma.ChangeLogEntryCreateManyInput[] = [];
      if (recmanCandidateId) {
        categoryEntries.push({
          changeLogId: log.id,
          model: "RecmanCandidate",
          recordId: recmanCandidateId,
          field: "category",
          oldValue: from,
          newValue: to,
        });
      }
      if (personnelId) {
        categoryEntries.push({
          changeLogId: log.id,
          model: "Personnel",
          recordId: personnelId,
          field: "category",
          oldValue: from,
          newValue: to,
        });
      }

      // Sideeffekter: feltendringer per modell.
      for (const c of candidateChanges) {
        if (!recmanCandidateId) continue;
        categoryEntries.push({
          changeLogId: log.id,
          model: "RecmanCandidate",
          recordId: recmanCandidateId,
          field: c.field,
          oldValue: c.oldValue ?? Prisma.JsonNull,
          newValue: c.newValue ?? Prisma.JsonNull,
        });
      }
      for (const p of personnelChanges) {
        if (!personnelId) continue;
        categoryEntries.push({
          changeLogId: log.id,
          model: "Personnel",
          recordId: personnelId,
          field: p.field,
          oldValue: p.oldValue ?? Prisma.JsonNull,
          newValue: p.newValue ?? Prisma.JsonNull,
        });
      }
      for (const pe of periodChanges) {
        categoryEntries.push({
          changeLogId: log.id,
          model: "ContractorPeriod",
          recordId: pe.recordId,
          field: pe.field,
          oldValue: pe.oldValue ?? Prisma.JsonNull,
          newValue: pe.newValue ?? Prisma.JsonNull,
        });
      }

      if (categoryEntries.length > 0) {
        await tx.changeLogEntry.createMany({ data: categoryEntries });
      }

      return { personnelId, recmanCandidateId };
    });

    return {
      success: true,
      from,
      to,
      personnelId: result.personnelId,
      recmanCandidateId: result.recmanCandidateId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ukjent feil ved kategoriendring";
    return { success: false, error: message };
  }
}
