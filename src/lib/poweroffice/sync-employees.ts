import { db } from "@/lib/db";
import { getEmployees } from "./resources";
import { syncResource } from "./sync";
import {
  getPowerOfficeTenantPoIdWhere,
  POWER_OFFICE_TENANT_SLUG,
} from "./config";
import type { POEmployeeResponse } from "./types";
import {
  findOrCreatePersonnel,
  enrichPersonnel,
} from "@/lib/personnel-matcher";
import { diagnoseFields } from "@/lib/sync/conflict-detector";
import {
  emptySyncResult,
  mergeSyncResults,
  notifySyncResult,
  processSyncDiagnosis,
  type SyncQueueClient,
  type SyncResult,
} from "@/lib/sync/sync-queue";

// Felter vi sammenligner mellom lokal POEmployee, base (rawJson fra forrige
// sync) og ny remote payload. Resten av feltene er enten metadata
// (lastSyncedAt, code) eller styres ikke fra dette laget.
const COMPARED_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "department",
  "jobTitle",
  "isActive",
] as const;

// Felter på POEmployee-modellen er ikke nøyaktig like de fra PowerOffice.
// Vi mapper PO-payload (både fersk og base) til samme felt-sett som
// lokalbasen bruker, slik at detektoren kan sammenligne direkte.
function mapPoToLocalShape(
  po: POEmployeeResponse | Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!po) return null;
  const p = po as POEmployeeResponse & Record<string, unknown>;
  return {
    firstName: p.firstName ?? null,
    lastName: p.lastName ?? null,
    email: p.emailAddress ?? null,
    phone: p.phoneNumber ?? null,
    department: p.departmentCode ?? null,
    jobTitle: p.jobTitle ?? null,
    isActive: p.isActive ?? null,
  };
}

function parseBase(rawJson: string | null): Record<string, unknown> | null {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    return mapPoToLocalShape(parsed);
  } catch {
    return null;
  }
}

// Mapper feltnavn fra lokal POEmployee-shape til Prisma-update-input.
// Brukes inne i applyChange når en safe-remote endring skal skrives.
function applyFieldUpdate(
  field: string,
  value: unknown
): Record<string, unknown> {
  // Alle COMPARED_FIELDS bruker samme navn på POEmployee-modellen, så
  // vi kan returnere direkte. Hvis feltsettet utvides og krever mapping,
  // gjøres det her.
  return { [field]: value as never };
}

/**
 * Synkroniserer ansatte fra PowerOffice. Bruker konfliktdetektor for å
 * skille mellom trygge pull-endringer, lokale uendrede felt, konflikter
 * og manglende koblinger. Returnerer en aggregert `SyncResult` i tillegg
 * til de eksisterende tall fra `syncResource`.
 */
export async function syncEmployees(userId: string) {
  const perRecord: SyncResult[] = [];

  const baseResult = await syncResource<POEmployeeResponse>({
    resourceType: "Employee",
    fetchAll: getEmployees,
    userId,
    upsertItem: async (po) => {
      const poId = BigInt(po.id);

      const existing = await db.pOEmployee.findUnique({
        where: getPowerOfficeTenantPoIdWhere(poId),
        select: {
          id: true,
          personnelId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          department: true,
          jobTitle: true,
          isActive: true,
          rawJson: true,
        },
      });

      const remoteShape = mapPoToLocalShape(po);
      const localShape = existing
        ? {
            firstName: existing.firstName,
            lastName: existing.lastName,
            email: existing.email,
            phone: existing.phone,
            department: existing.department,
            jobTitle: existing.jobTitle,
            isActive: existing.isActive,
          }
        : null;
      const baseShape = existing ? parseBase(existing.rawJson) : null;

      const diagnosis = diagnoseFields({
        local: localShape,
        remote: remoteShape,
        base: baseShape,
        fields: [...COMPARED_FIELDS],
      });

      // Diagnostiseringen styrer hvilke felt som faktisk skrives.
      // Felt som er "trygge" (remote_only eller safeRemote) skrives via
      // applyChange. Felt med konflikt persisteres som SyncConflict.
      // Felt med kun lokal endring lar vi være i fred (pending push).
      const safeFieldUpdates: Record<string, unknown> = {};

      const queueResult = await processSyncDiagnosis(db as unknown as SyncQueueClient, {
        source: "POWEROFFICE",
        model: "POEmployee",
        recordId: existing?.id ?? `po:${po.id}`,
        diagnosis,
        applyChange: async (field, value) => {
          // Vi samler trygge feltskriv i ett objekt og applyer dem under
          // ett upsert/update-kall etterpå. Det reduserer DB-rundturer.
          Object.assign(safeFieldUpdates, applyFieldUpdate(field, value));
        },
      });
      perRecord.push(queueResult);

      // Hvis raden ikke finnes ennå (missing_link), oppretter vi den
      // basert på remote-data. For eksisterende rader skriver vi kun
      // felt-diff (safeFieldUpdates) + alltid metadata (rawJson,
      // lastSyncedAt, code).
      const poEmployee = await db.pOEmployee.upsert({
        where: getPowerOfficeTenantPoIdWhere(poId),
        create: {
          tenantSlug: POWER_OFFICE_TENANT_SLUG,
          poId,
          code: po.code,
          firstName: po.firstName,
          lastName: po.lastName,
          email: po.emailAddress,
          phone: po.phoneNumber,
          department: po.departmentCode,
          jobTitle: po.jobTitle,
          isActive: po.isActive,
          rawJson: JSON.stringify(po),
          lastSyncedAt: new Date(),
        },
        update: {
          ...safeFieldUpdates,
          code: po.code,
          // rawJson og lastSyncedAt oppdateres alltid: rawJson er vår
          // base for neste sync, lastSyncedAt er metadata. Selve felt-
          // verdiene styres av safeFieldUpdates over.
          rawJson: JSON.stringify(po),
          lastSyncedAt: new Date(),
        },
        select: { id: true, personnelId: true },
      });

      // Auto-match or create Personnel record
      if (!poEmployee.personnelId) {
        const personnelId = await findOrCreatePersonnel({
          firstName: po.firstName,
          lastName: po.lastName,
          email: po.emailAddress,
          phone: po.phoneNumber,
          department: po.departmentCode,
          role: po.jobTitle || "Ansatt",
        });

        await db.pOEmployee.update({
          where: { id: poEmployee.id },
          data: { personnelId },
        });
      } else {
        // Enrich existing Personnel with fresh PO data
        await enrichPersonnel(poEmployee.personnelId, {
          phone: po.phoneNumber,
          department: po.departmentCode,
        });
      }
    },
  });

  const conflictsSummary = mergeSyncResults(perRecord);

  // Notifiser admins hvis noe krever oppmerksomhet. Vi gjør dette på slutten
  // av runden slik at vi ikke spammer ett varsel per rad.
  if (conflictsSummary.conflicts > 0 || conflictsSummary.missingLink > 0) {
    try {
      await notifySyncResult(
        db as unknown as SyncQueueClient,
        "POWEROFFICE",
        conflictsSummary
      );
    } catch (err) {
      console.error("[PowerOffice Sync] Klarte ikke opprette varsel:", err);
    }
  }

  return {
    ...baseResult,
    conflicts: conflictsSummary,
  };
}

// Eksponerer en tom default for kalleren-kjede der employees-syncen ikke
// kjørte (f.eks. når et annet ressurssett feiler).
export function emptyEmployeeSyncResult(): SyncResult {
  return emptySyncResult();
}
