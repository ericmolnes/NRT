// Detektor for sync-konflikter.
//
// Sammenligner per-felt mellom tre lag for én logisk rad:
//   • local  — gjeldende verdi i NRT-databasen
//   • remote — verdi fra eksternt system (RecMan/PowerOffice)
//   • base   — siste synkroniserte verdi (snapshot fra forrige pull)
//
// Logikken er bevisst pure: ingen DB, ingen sideeffekter. Det gjør at
// queue-laget kan bestemme hva som skal skrives, hva som er konflikt og
// hva som blir liggende som "pending push" — uten at detektoren trenger
// å vite noe om Prisma eller hvilken modell vi behandler.
//
// **Base-håndtering uten snapshot-kolonne:** Mange av sync-modellene har
// allerede et `rawJson`-felt med forrige payload fra remote. Det fungerer
// som base for våre formål: det viser hva remote sa sist, så hvis
// remote-verdien er endret kan vi være rimelig sikre på at remote har
// endret seg siden forrige sync. Hvis kalleren ikke har en base
// tilgjengelig (`base: null`), markerer vi alle felt-forskjeller som
// konflikt — ingen silent overwrite.

export type FieldDiff = {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  baseValue: unknown;
};

export type SyncDiagnosis =
  | { kind: "no_change" }
  | { kind: "remote_only"; changes: FieldDiff[] }
  | { kind: "local_only"; changes: FieldDiff[] }
  | { kind: "conflict"; conflicts: FieldDiff[]; safeRemote: FieldDiff[] }
  | { kind: "missing_link" };

export type DiagnoseInput = {
  local: Record<string, unknown> | null;
  remote: Record<string, unknown> | null;
  base: Record<string, unknown> | null;
  fields: string[];
};

/**
 * Normaliserer JS-egenheter slik at `undefined` og `null` regnes som likt
 * (begge representerer "ikke satt"). Det forhindrer falsk konflikt når et
 * API ikke returnerer et felt vs. når lokalbasen har eksplisitt null.
 */
function normalize(value: unknown): unknown {
  if (value === undefined) return null;
  return value;
}

/**
 * Sjekker likhet for primitive verdier og enkle objekter/arrayer som ofte
 * ligger i sync-data. For dypere strukturer faller vi tilbake på JSON-
 * sammenligning — ikke perfekt, men dekker de typiske feltene
 * (strenger, datoer, ID-er, booleans, små arrays).
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na === null || nb === null) return false;
  if (typeof na !== typeof nb) return false;
  if (typeof na === "object") {
    try {
      return JSON.stringify(na) === JSON.stringify(nb);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Diagnostiser endringer på tvers av lag for ett sett med felt.
 * Se modul-doc for full semantikk.
 */
export function diagnoseFields(input: DiagnoseInput): SyncDiagnosis {
  const { local, remote, base, fields } = input;

  if (remote === null) {
    // Vi har ingenting nytt fra remote å vurdere. Sletting håndteres
    // separat av kalleren — detektoren gjør ingen antagelser her.
    return { kind: "no_change" };
  }

  if (local === null) {
    // Lokal rad finnes ikke ennå — typisk en ny remote-rad som bør
    // opprettes eller kobles. Vi rapporterer det som missing_link
    // slik at kalleren kan bestemme skjebnen (opprett eller koble).
    return { kind: "missing_link" };
  }

  const remoteOnly: FieldDiff[] = [];
  const localOnly: FieldDiff[] = [];
  const conflicts: FieldDiff[] = [];

  for (const field of fields) {
    const localValue = normalize(local[field]);
    const remoteValue = normalize(remote[field]);
    const baseValue = base ? normalize(base[field]) : null;

    if (valuesEqual(localValue, remoteValue)) {
      // Begge sider er allerede i synk for dette feltet — ingen handling.
      continue;
    }

    if (base) {
      const localChanged = !valuesEqual(localValue, baseValue);
      const remoteChanged = !valuesEqual(remoteValue, baseValue);

      if (remoteChanged && !localChanged) {
        remoteOnly.push({ field, localValue, remoteValue, baseValue });
      } else if (localChanged && !remoteChanged) {
        localOnly.push({ field, localValue, remoteValue, baseValue });
      } else if (localChanged && remoteChanged) {
        // Begge har endret seg til ulike verdier siden base — ekte konflikt.
        conflicts.push({ field, localValue, remoteValue, baseValue });
      } else {
        // Verken local eller remote har endret seg ift. base, men de er
        // ulike. Dette skjer kun hvis base mangler felt eller verdier er
        // delvis korrupte. Markér som konflikt for sikkerhets skyld.
        conflicts.push({ field, localValue, remoteValue, baseValue });
      }
    } else {
      // Uten base kan vi ikke skille lokal- fra remote-endring. Vi
      // konservativt markerer som konflikt for å forhindre silent
      // overwrite — samme regel gjelder gjennom hele systemet.
      conflicts.push({ field, localValue, remoteValue, baseValue: null });
    }
  }

  if (conflicts.length > 0) {
    return { kind: "conflict", conflicts, safeRemote: remoteOnly };
  }
  if (remoteOnly.length > 0) {
    return { kind: "remote_only", changes: remoteOnly };
  }
  if (localOnly.length > 0) {
    return { kind: "local_only", changes: localOnly };
  }
  return { kind: "no_change" };
}
