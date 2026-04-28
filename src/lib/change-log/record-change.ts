// Logger en gruppe feltendringer som én ChangeLog med tilhørende entries.
//
// Helperen er bevisst frikoblet fra Prisma-klienten: kalleren sender inn et
// `ChangeLogClient`-objekt som eksponerer akkurat de operasjonene vi trenger.
// Det lar oss enhetsteste i minne og gjenbruke samme kode fra både server
// actions, sync-jobs og AI-assistenten.
//
// **Atomisitet:** All skriving (parent-loggen + entries) skjer inne i en
// `$transaction`. Hvis `createMany` feiler etter at `changeLog.create` har
// kjørt, ruller transaksjonen begge tilbake slik at vi aldri etterlater en
// foreldreløs ChangeLog uten entries.
//
// **JSON-null-konvensjon:** Vi normaliserer `oldValue`/`newValue` med `??
// null`, slik at både `undefined` og `null` blir lagret som DB NULL. Hvis
// kalleren trenger å skille mellom "ikke satt" og JSON-`null`-literal, må
// verdien pakkes inn (f.eks. `{ value: null }`) eller sendes som
// `Prisma.JsonNull`. Se også JSDoc på `ChangeEntryInput` i types.ts.

import type {
  ChangeLogClient,
  RecordChangeInput,
  RecordChangeResult,
} from "./types";

const VALID_ACTOR_TYPES = new Set(["USER", "AI"]);
const VALID_SOURCES = new Set([
  "USER_ACTION",
  "AI_ASSISTANT",
  "RECMAN_SYNC",
  "POWEROFFICE_SYNC",
  "SYSTEM",
]);

export async function recordChange(
  client: ChangeLogClient,
  input: RecordChangeInput
): Promise<RecordChangeResult> {
  if (!VALID_ACTOR_TYPES.has(input.actorType)) {
    throw new Error(`Ugyldig actorType: ${String(input.actorType)}`);
  }
  if (!VALID_SOURCES.has(input.source)) {
    throw new Error(`Ugyldig source: ${String(input.source)}`);
  }
  if (!Array.isArray(input.entries) || input.entries.length === 0) {
    throw new Error("recordChange krever minst én endring i entries");
  }

  for (const entry of input.entries) {
    if (!entry.model || typeof entry.model !== "string") {
      throw new Error("Hver endring må ha et modellnavn (model)");
    }
    if (!entry.recordId || typeof entry.recordId !== "string") {
      throw new Error("Hver endring må ha en recordId");
    }
    if (!entry.field || typeof entry.field !== "string") {
      throw new Error("Hver endring må ha et feltnavn (field)");
    }
  }

  // Hele logginnsettelsen skjer i én transaksjon: parent-rad, child-entries
  // og oppfølgings-findMany. Hvis en av stegene feiler, etterlater vi ikke
  // en foreldreløs ChangeLog uten tilhørende entries.
  return client.$transaction(async (tx) => {
    const log = await tx.changeLog.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        source: input.source,
        summary: input.summary ?? null,
        runId: input.runId ?? null,
      },
    });

    await tx.changeLogEntry.createMany({
      data: input.entries.map((entry) => ({
        changeLogId: log.id,
        model: entry.model,
        recordId: entry.recordId,
        field: entry.field,
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
      })),
    });

    // Hent ut id-ene til de nyopprettede entries slik at kalleren kan
    // referere dem (f.eks. for senere rollback). Vi spør på `changeLogId`
    // siden createMany ikke returnerer id-ene direkte.
    const entries = await tx.changeLogEntry.findMany({
      where: { changeLogId: log.id },
    });

    return {
      changeLogId: log.id,
      entryIds: entries.map((e) => e.id),
    };
  });
}
