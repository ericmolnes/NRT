// Oppretter en SystemNotification-rad. Helperen er frikoblet fra Prisma
// gjennom `NotificationClient`-grensesnittet, slik at server actions,
// sync-jobber og AI-agentruter alle kan kalle den med samme signatur, og
// testene kan injisere en in-memory stub.
//
// **Validering:** En notifikasjon må ha minst én mottaker (`targetUserId`
// eller `targetLevel`). Uten det ville den vært usynlig for alle og bare
// rotet til DB-en. Vi kaster heller en tydelig feil enn å skrive en
// ubrukelig rad.

import type {
  CreateNotificationInput,
  NotificationClient,
} from "./types";

const VALID_KINDS = new Set([
  "ACCESS_REQUEST",
  "SYNC_CONFLICT",
  "SYNC_FAILURE",
  "AI_ACTION",
  "DOCUMENT_REVIEW",
  "SUPPLIER_REVIEW",
  "GENERIC",
]);

const VALID_SEVERITIES = new Set(["INFO", "WARNING", "ERROR"]);

const VALID_LEVELS = new Set(["MINIMUM", "USER", "ADMIN"]);

export async function createNotification(
  client: NotificationClient,
  input: CreateNotificationInput
): Promise<{ id: string }> {
  if (!VALID_KINDS.has(input.kind)) {
    throw new Error(`Ugyldig notification-kind: ${String(input.kind)}`);
  }
  if (input.severity && !VALID_SEVERITIES.has(input.severity)) {
    throw new Error(`Ugyldig severity: ${String(input.severity)}`);
  }
  if (input.targetLevel && !VALID_LEVELS.has(input.targetLevel)) {
    throw new Error(`Ugyldig targetLevel: ${String(input.targetLevel)}`);
  }
  if (!input.title || typeof input.title !== "string") {
    throw new Error("Notification krever en title");
  }

  // Vi krever minst én mottaker. Uten dette ville varselet vært uleselig
  // for alle (hverken direkte- eller broadcast-filteret ville matche).
  const hasUser = input.targetUserId != null && input.targetUserId !== "";
  const hasLevel = input.targetLevel != null;
  if (!hasUser && !hasLevel) {
    throw new Error(
      "Notification krever målgruppe: enten targetUserId eller targetLevel må være satt"
    );
  }

  const created = await client.systemNotification.create({
    data: {
      kind: input.kind,
      severity: input.severity ?? "INFO",
      title: input.title,
      body: input.body ?? null,
      // payload er Json? — vi sender uændret videre. Kalleren er ansvarlig
      // for at innholdet er JSON-serialiserbart (Prisma vil kaste hvis ikke).
      payload: input.payload ?? null,
      targetUserId: input.targetUserId ?? null,
      targetLevel: input.targetLevel ?? null,
    },
    select: { id: true },
  });

  return { id: created.id };
}
