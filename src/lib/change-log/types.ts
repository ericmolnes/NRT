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

/**
 * En enkelt feltendring som skal logges.
 *
 * **JSON-null-konvensjon:** Både `oldValue: undefined` og `oldValue: null`
 * lagres som DB NULL. Hvis kalleren må skille mellom "ikke satt" og en faktisk
 * JSON-`null`-literal, må verdien pakkes i et objekt (f.eks. `{ value: null }`)
 * eller sendes som `Prisma.JsonNull`. Helperen normaliserer ikke videre.
 *
 * **PII-ansvar:** `oldValue` og `newValue` lagres verbatim i databasen. Kalleren
 * er ansvarlig for å redigere/maskere sensitive felter (passord, tokens,
 * lønn osv.) før de logges. Foundation-laget gjør ingen automatisk redaksjon.
 */
export type ChangeEntryInput = {
  model: string;
  recordId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

/**
 * Inputtet til `recordChange` — én logisk gruppe med én eller flere endringer.
 *
 * **Viktig om PII:** Verdiene i `entries[].oldValue` og `entries[].newValue`
 * persisteres som JSON i databasen uten filtrering. Kalleren er ansvarlig
 * for å redigere ut sensitiv informasjon (passordhasher, API-tokens,
 * lønnsdata o.l.) før de sendes hit. Det finnes ingen redact-hook ennå.
 */
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
 *
 * **Konkurransekontrakt:** Applieren MÅ verifisere at den nåværende verdien
 * i databasen matcher `entry.newValue` før den skriver tilbake `entry.oldValue`.
 * Hvis en samtidig skriving har endret feltet etter at endringsloggen ble
 * registrert, vil en uvettig rollback stille klobbe den nye verdien. Bruk en
 * compare-and-swap eller eksplisitt sjekk inne i `tx`. Foundation-laget kan
 * ikke gjøre dette på vegne av kalleren fordi det ikke kjenner modellen.
 *
 * Den andre parameteren `tx` er en transaksjonell `ChangeLogClient` —
 * applieren skal bruke `tx` (ikke en frittstående Prisma-klient) slik at
 * skrivinger og selve `rolledBackAt`-markeringen utgjør én atomisk enhet.
 */
export type RollbackApplier = (
  entry: ChangeLogEntryRow,
  tx: ChangeLogClient
) => Promise<boolean> | boolean;

export interface ChangeLogClient {
  changeLog: {
    create(args: CreateChangeLogArgs): Promise<ChangeLogRow>;
  };
  changeLogEntry: {
    createMany(args: CreateChangeLogEntriesArgs): Promise<{ count: number }>;
    findMany(args: FindEntriesArgs): Promise<ChangeLogEntryRow[]>;
    update(args: MarkEntryRolledBackArgs): Promise<ChangeLogEntryRow>;
  };
  /**
   * Kjør en transaksjonsblokk. Implementasjonen skal sende en transaksjonell
   * klient (samme `ChangeLogClient`-form, men bundet til transaksjonen) inn
   * i callbacken. Hvis callbacken kaster, skal hele transaksjonen rulles
   * tilbake — inkludert eventuelle skrivinger applieren gjorde gjennom `tx`.
   */
  $transaction<T>(fn: (tx: ChangeLogClient) => Promise<T>): Promise<T>;
}
