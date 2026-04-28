// Ruller tilbake en eller flere feltendringer logget gjennom `recordChange`.
//
// Foundation-laget vet ikke hvilke konkrete modeller som finnes i systemet —
// derfor sender kalleren inn en `RollbackApplier`-callback som gjør den
// faktiske skrivingen tilbake til riktig Prisma-modell. Dette holder
// endringsloggen agnostisk og lett testbar.
//
// **Atomisitet:** Hele rollback-løkken kjøres inne i en `$transaction`. Både
// applier-skrivingene og oppdateringen av `rolledBackAt` bruker samme `tx`,
// slik at feil halvveis ruller tilbake både forretningsdataene og
// audit-logg-markeringen. Det er kalleren sitt ansvar å bruke den `tx` som
// gis videre til applieren — ellers er ikke skrivingene transaksjonelle.

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

  // Selve rollback-arbeidet (applier-kall + markering) skjer i én transaksjon
  // slik at vi aldri ender opp med tilbakestilte forretningsdata uten
  // tilsvarende `rolledBackAt`-markering, eller omvendt.
  return client.$transaction(async (tx) => {
    const rolledBackIds: string[] = [];

    for (const entry of candidates) {
      // Skriv `oldValue` tilbake gjennom applier-callbacken først. Vi sender
      // den transaksjonelle klienten inn, slik at applieren kan gjøre
      // compare-and-swap-skrivinger inne i samme transaksjon.
      // Hvis applier kaster, lar vi feilen propagere — `$transaction` ruller
      // da tilbake både applier-skrivinger og eventuelle markeringer som
      // ble gjort tidligere i samme løkke.
      const applied = await applier(entry, tx);
      if (!applied) continue;

      await tx.changeLogEntry.update({
        where: { id: entry.id },
        data: { rolledBackAt: new Date() },
      });
      rolledBackIds.push(entry.id);
    }

    return {
      rolledBack: rolledBackIds.length,
      entryIds: rolledBackIds,
    };
  });
}
