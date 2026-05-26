// Sync-kø: limet mellom konfliktdetektoren og handlingene som skal utføres.
//
// Detektoren leverer en `SyncDiagnosis`. Køen bestemmer hva som faktisk
// skjer: trygge remote-only-endringer skrives via `applyChange`-callbacken,
// konflikter persisteres som `SyncConflict`-rader for manuell oppløsning,
// `local_only` flagges som "pending push" (telt — selve push-en hører
// hjemme i en senere fase), og `missing_link` rapporteres slik at kalleren
// kan opprette/koble.
//
// Køen er bevisst Prisma-agnostisk: den får inn et `SyncQueueClient`-
// grensesnitt som eksponerer akkurat de operasjonene vi trenger. Det lar
// produksjon bruke Prisma-klienten direkte og tester bruke en in-memory
// stub. Skrivinger til lokalbasen skjer gjennom `applyChange`-callbacken
// som kalleren leverer, slik at modell-spesifikke detaljer ikke lekker
// inn hit.

import type { SyncDiagnosis } from "./conflict-detector";

// ─── Eksterne typer som speiler Prisma-skjemaet ────────────────────

export type SyncSource = "RECMAN" | "POWEROFFICE";

export type SyncConflictRow = {
  id: string;
  source: SyncSource;
  model: string;
  recordId: string | null;
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  status: "UNRESOLVED" | "RESOLVED" | "IGNORED";
  detectedAt: Date;
};

export type CreateSyncConflictArgs = {
  data: {
    source: SyncSource;
    model: string;
    recordId?: string | null;
    field: string;
    localValue?: unknown;
    remoteValue?: unknown;
  };
};

export type FindSyncConflictArgs = {
  where: {
    source: SyncSource;
    model: string;
    recordId?: string | null;
    field: string;
    status: "UNRESOLVED" | "RESOLVED" | "IGNORED";
  };
};

export type SystemNotificationKind =
  | "ACCESS_REQUEST"
  | "SYNC_CONFLICT"
  | "SYNC_FAILURE"
  | "AI_ACTION"
  | "DOCUMENT_REVIEW"
  | "SUPPLIER_REVIEW"
  | "GENERIC";

export type NotificationSeverity = "INFO" | "WARNING" | "ERROR";

export type AccessLevel = "MINIMUM" | "USER" | "ADMIN";

export type SystemNotificationRow = {
  id: string;
  kind: SystemNotificationKind;
  title: string;
  body: string | null;
  severity: NotificationSeverity;
  targetLevel: AccessLevel | null;
  targetUserId: string | null;
};

export type CreateSystemNotificationArgs = {
  data: {
    kind: SystemNotificationKind;
    title: string;
    body?: string | null;
    severity?: NotificationSeverity;
    targetLevel?: AccessLevel | null;
    targetUserId?: string | null;
    payload?: unknown;
  };
};

export interface SyncQueueClient {
  syncConflict: {
    findFirst?(args: FindSyncConflictArgs): Promise<SyncConflictRow | null>;
    create(args: CreateSyncConflictArgs): Promise<SyncConflictRow>;
  };
  systemNotification: {
    create(args: CreateSystemNotificationArgs): Promise<{ id: string }>;
  };
}

// ─── Resultat-aggregering ───────────────────────────────────────────

export type SyncResult = {
  applied: number;
  conflicts: number;
  pendingPush: number;
  missingLink: number;
  unchanged: number;
};

export function emptySyncResult(): SyncResult {
  return { applied: 0, conflicts: 0, pendingPush: 0, missingLink: 0, unchanged: 0 };
}

export function mergeSyncResults(results: SyncResult[]): SyncResult {
  const total = emptySyncResult();
  for (const r of results) {
    total.applied += r.applied;
    total.conflicts += r.conflicts;
    total.pendingPush += r.pendingPush;
    total.missingLink += r.missingLink;
    total.unchanged += r.unchanged;
  }
  return total;
}

// ─── Hovedoperasjon ─────────────────────────────────────────────────

export type ProcessDiagnosisInput = {
  source: SyncSource;
  model: string;
  recordId: string;
  diagnosis: SyncDiagnosis;
  /**
   * Skriver én safe-remote-endring til lokalbasen. Kalleren bestemmer
   * hvordan feltet faktisk lagres (Prisma-update, JSON-merge, osv.).
   */
  applyChange: (field: string, value: unknown) => Promise<void>;
};

export async function processSyncDiagnosis(
  client: SyncQueueClient,
  input: ProcessDiagnosisInput
): Promise<SyncResult> {
  const { source, model, recordId, diagnosis, applyChange } = input;
  const result = emptySyncResult();

  switch (diagnosis.kind) {
    case "no_change":
      result.unchanged = 1;
      return result;

    case "remote_only":
      for (const change of diagnosis.changes) {
        await applyChange(change.field, change.remoteValue);
        result.applied += 1;
      }
      return result;

    case "local_only":
      // Vi skriver IKKE konflikt-rader for rene lokal-endringer; de er
      // ikke konflikter, bare "pending push". Når push-laget bygges
      // senere kan det lese disse via change-loggen eller en egen kø.
      result.pendingPush = diagnosis.changes.length;
      return result;

    case "conflict":
      for (const change of diagnosis.conflicts) {
        const identity = {
          source,
          model,
          recordId,
          field: change.field,
        };
        const existing = await client.syncConflict.findFirst?.({
          where: {
            ...identity,
            status: "UNRESOLVED",
          },
        });

        if (!existing) {
          await client.syncConflict.create({
            data: {
              ...identity,
              localValue: change.localValue ?? null,
              remoteValue: change.remoteValue ?? null,
            },
          });
        }
        result.conflicts += 1;
      }
      // Trygge remote-endringer ved siden av konflikter kan fortsatt
      // applyes — review-gate sier "ingen silent overwrite på samme
      // felt", ikke "ikke rør andre felt".
      for (const change of diagnosis.safeRemote) {
        await applyChange(change.field, change.remoteValue);
        result.applied += 1;
      }
      return result;

    case "missing_link":
      result.missingLink = 1;
      return result;
  }
}

// ─── Notifikasjon ved konflikter ───────────────────────────────────

/**
 * Oppretter et SYNC_CONFLICT-varsel hvis sync-runden inneholder konflikter.
 * Targetes mot ADMIN-nivået siden bare admins kan løse konflikter manuelt.
 * Returnerer notifikasjons-id-en eller null hvis ingen ble opprettet.
 */
export async function notifySyncResult(
  client: SyncQueueClient,
  source: SyncSource,
  result: SyncResult
): Promise<string | null> {
  if (result.conflicts === 0 && result.missingLink === 0) {
    return null;
  }

  const sourceName = source === "RECMAN" ? "RecMan" : "PowerOffice";
  const parts: string[] = [];
  if (result.conflicts > 0) {
    parts.push(`${result.conflicts} feltkonflikt${result.conflicts === 1 ? "" : "er"}`);
  }
  if (result.missingLink > 0) {
    parts.push(
      `${result.missingLink} manglende kobling${result.missingLink === 1 ? "" : "er"}`
    );
  }

  const created = await client.systemNotification.create({
    data: {
      kind: "SYNC_CONFLICT",
      severity: "WARNING",
      title: `${sourceName}-sync krever oppmerksomhet`,
      body: `Synkronisering oppdaget ${parts.join(" og ")}. Gå til konflikt-listen for å løse.`,
      targetLevel: "ADMIN",
      payload: {
        source,
        applied: result.applied,
        conflicts: result.conflicts,
        pendingPush: result.pendingPush,
        missingLink: result.missingLink,
      },
    },
  });

  return created.id;
}
