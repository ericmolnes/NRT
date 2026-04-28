// Felles typer for endringsloggen.
//
// Denne modulen definerer kontrakten mellom `recordChange` / `rollbackChange`
// og resten av systemet. Helperne avhenger ikke av Prisma-klienten direkte —
// i stedet tar de inn en `ChangeLogClient` som eksponerer akkurat de
// operasjonene som trengs. Det gjør koden lett å enhetsteste og frikobler
// foundation-laget fra konkrete persistens-detaljer.

export type ChangeActorType = "USER" | "AI";

export type ChangeSource =
  | "USER_ACTION"
  | "AI_ASSISTANT"
  | "RECMAN_SYNC"
  | "POWEROFFICE_SYNC"
  | "SYSTEM";

/** En enkelt feltendring som skal logges. */
export type ChangeEntryInput = {
  model: string;
  recordId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

/** Inputtet til `recordChange` — én logisk gruppe med én eller flere endringer. */
export type RecordChangeInput = {
  actorType: ChangeActorType;
  actorId?: string | null;
  actorName?: string | null;
  source: ChangeSource;
  summary?: string | null;
  /**
   * Eksternt run-id (for AI-batcher eller sync-kjøringer). Lar konsumenter
   * koble flere endringslogger til samme overordnete kjøring.
   */
  runId?: string | null;
  entries: ChangeEntryInput[];
};

export type RecordChangeResult = {
  changeLogId: string;
  entryIds: string[];
};

/** Referanse for rollback — enten én enkelt entry eller hele gruppen. */
export type RollbackRef =
  | { entryId: string; changeLogId?: never; runId?: never }
  | { changeLogId: string; entryId?: never; runId?: never }
  | { runId: string; entryId?: never; changeLogId?: never };

export type RollbackResult = {
  rolledBack: number;
  entryIds: string[];
};

// ─── Klient-kontrakt ──────────────────────────────────────────────
//
// Bare de operasjonene helperne trenger. Produksjon sender inn
// Prisma-klienten; tester sender inn en stub.

export type ChangeLogRow = {
  id: string;
  actorType: ChangeActorType;
  actorId: string | null;
  actorName: string | null;
  source: ChangeSource;
  summary: string | null;
  runId: string | null;
  createdAt: Date;
};

export type ChangeLogEntryRow = {
  id: string;
  changeLogId: string;
  model: string;
  recordId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  rolledBackAt: Date | null;
  createdAt: Date;
};

export type CreateChangeLogArgs = {
  data: {
    actorType: ChangeActorType;
    actorId?: string | null;
    actorName?: string | null;
    source: ChangeSource;
    summary?: string | null;
    runId?: string | null;
  };
};

export type CreateChangeLogEntriesArgs = {
  data: Array<{
    changeLogId: string;
    model: string;
    recordId: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
};

export type FindEntriesArgs = {
  where: {
    id?: string;
    changeLogId?: string;
    /**
     * Filter via parent ChangeLog. `runId` finnes bare på ChangeLog-modellen,
     * så for å rulle tilbake alle entries i en kjøring må vi gå via relasjonen.
     */
    changeLog?: {
      runId?: string;
    };
    rolledBackAt?: null;
  };
};

export type MarkEntryRolledBackArgs = {
  where: { id: string };
  data: { rolledBackAt: Date };
};

/**
 * Callback som skriver `oldValue` tilbake gjennom riktig modell.
 * Foundation-laget vet ikke hvilke modeller som finnes — kalleren
 * sender inn en applier som mapper `model` til riktig Prisma-operasjon.
 *
 * Returner `true` hvis verdien ble skrevet tilbake, `false` hvis modellen
 * er ukjent og rollback skal hoppes over for denne posten.
 */
export type RollbackApplier = (entry: ChangeLogEntryRow) => Promise<boolean> | boolean;

export interface ChangeLogClient {
  changeLog: {
    create(args: CreateChangeLogArgs): Promise<ChangeLogRow>;
  };
  changeLogEntry: {
    createMany(args: CreateChangeLogEntriesArgs): Promise<{ count: number }>;
    findMany(args: FindEntriesArgs): Promise<ChangeLogEntryRow[]>;
    update(args: MarkEntryRolledBackArgs): Promise<ChangeLogEntryRow>;
  };
}
