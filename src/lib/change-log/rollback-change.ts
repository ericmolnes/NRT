// Ruller tilbake en eller flere feltendringer logget gjennom `recordChange`.
//
// Foundation-laget vet ikke hvilke konkrete modeller som finnes i systemet —
// derfor sender kalleren inn en `RollbackApplier`-callback som gjør den
// faktiske skrivingen tilbake til riktig Prisma-modell. Dette holder
// endringsloggen agnostisk og lett testbar.

import type {
  ChangeLogClient,
  ChangeLogEntryRow,
  RollbackApplier,
  RollbackRef,
  RollbackResult,
} from "./types";

export async function rollbackChange(
  client: ChangeLogClient,
  ref: RollbackRef,
  applier: RollbackApplier
): Promise<RollbackResult> {
  if (!ref || (!("entryId" in ref) && !("changeLogId" in ref) && !("runId" in ref))) {
    throw new Error("rollbackChange krever en referanse: entryId, changeLogId eller runId");
  }

  const where: {
    id?: string;
    changeLogId?: string;
    changeLog?: { runId?: string };
    rolledBackAt?: null;
  } = {
    rolledBackAt: null,
  };
  if ("entryId" in ref && ref.entryId) where.id = ref.entryId;
  if ("changeLogId" in ref && ref.changeLogId) where.changeLogId = ref.changeLogId;
  // `runId` finnes bare på ChangeLog-modellen, så vi filtrerer via relasjonen.
  if ("runId" in ref && ref.runId) where.changeLog = { runId: ref.runId };

  const candidates: ChangeLogEntryRow[] = await client.changeLogEntry.findMany({ where });

  if (candidates.length === 0) {
    throw new Error("Fant ingen entries å rulle tilbake for den gitte referansen");
  }

  const rolledBackIds: string[] = [];

  for (const entry of candidates) {
    // Skriv `oldValue` tilbake gjennom applier-callbacken først.
    // Hvis applier kaster, lar vi feilen propagere — vi vil ikke markere
    // entryen som rullet tilbake hvis selve skrivingen feilet.
    const applied = await applier(entry);
    if (!applied) continue;

    await client.changeLogEntry.update({
      where: { id: entry.id },
      data: { rolledBackAt: new Date() },
    });
    rolledBackIds.push(entry.id);
  }

  return {
    rolledBack: rolledBackIds.length,
    entryIds: rolledBackIds,
  };
}
