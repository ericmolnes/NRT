// Lese-helpers for SystemNotification.
//
// Vi tilbyr tre operasjoner:
//   - listNotificationsForUser  — siste varsler rettet mot bruker eller nivå
//   - countUnreadForUser        — antall uleste (for badge-tellere i UI)
//   - markAsRead                — markerer ID-er som lest (idempotent)
//
// "Synlig for meg" defineres som EN av:
//   a) `targetUserId === userId` (direkte til meg)
//   b) `targetLevel === accessLevel` (broadcast til mitt nivå)
//
// Vi bygger OR-arrayen dynamisk og inkluderer kun grenene som faktisk har
// en verdi. Det unngår at en innlogget bruker uten userId matcher alle
// rader med `targetUserId = null`.

import type {
  AccessLevel,
  NotificationClient,
  SystemNotificationRow,
} from "./types";

export type AudienceQuery = {
  userId: string | null;
  accessLevel: AccessLevel;
  onlyUnread?: boolean;
  limit?: number;
};

function buildAudienceWhere(query: {
  userId: string | null;
  accessLevel: AccessLevel;
}): {
  OR: Array<{ targetUserId?: string; targetLevel?: AccessLevel }>;
} {
  const or: Array<{ targetUserId?: string; targetLevel?: AccessLevel }> = [];
  if (query.userId) {
    or.push({ targetUserId: query.userId });
  }
  or.push({ targetLevel: query.accessLevel });
  return { OR: or };
}

export async function listNotificationsForUser(
  client: NotificationClient,
  query: AudienceQuery
): Promise<SystemNotificationRow[]> {
  const where: {
    OR?: Array<{ targetUserId?: string; targetLevel?: AccessLevel }>;
    readAt?: null;
  } = buildAudienceWhere(query);

  if (query.onlyUnread) {
    where.readAt = null;
  }

  return client.systemNotification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: query.limit ?? 20,
  });
}

export async function countUnreadForUser(
  client: NotificationClient,
  query: { userId: string | null; accessLevel: AccessLevel }
): Promise<number> {
  return client.systemNotification.count({
    where: {
      ...buildAudienceWhere(query),
      readAt: null,
    },
  });
}

export async function markAsRead(
  client: NotificationClient,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  // Vi filtrerer på `readAt: null` slik at vi ikke overskriver et eldre
  // tidspunkt hvis raden allerede er lest. Idempotent.
  await client.systemNotification.updateMany({
    where: { id: { in: ids }, readAt: null },
    data: { readAt: new Date() },
  });
}
