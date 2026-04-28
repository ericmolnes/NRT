// Felles typer for varslingslaget.
//
// På samme måte som change-log-modulen er notification-helperne frikoblet
// fra Prisma-klienten: kalleren sender inn en `NotificationClient` som
// eksponerer akkurat de operasjonene vi trenger. Det gjør at vi kan
// enhetsteste i minne (uten DB) og kalle helperne fra både server actions,
// sync-jobber og senere AI-agentruter.

export type AccessLevel = "MINIMUM" | "USER" | "ADMIN";

export type SystemNotificationKind =
  | "ACCESS_REQUEST"
  | "SYNC_CONFLICT"
  | "SYNC_FAILURE"
  | "AI_ACTION"
  | "DOCUMENT_REVIEW"
  | "SUPPLIER_REVIEW"
  | "GENERIC";

export type NotificationSeverity = "INFO" | "WARNING" | "ERROR";

/**
 * Form på rad slik den ligger i DB. Vi bruker denne i listehelpers og i
 * stuber/test slik at vi slipper å dra inn full Prisma-type.
 */
export type SystemNotificationRow = {
  id: string;
  kind: SystemNotificationKind;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  payload: unknown;
  targetUserId: string | null;
  targetLevel: AccessLevel | null;
  readAt: Date | null;
  createdAt: Date;
};

export type CreateNotificationInput = {
  kind: SystemNotificationKind;
  severity?: NotificationSeverity;
  title: string;
  body?: string | null;
  payload?: Record<string, unknown> | null;
  targetUserId?: string | null;
  targetLevel?: AccessLevel | null;
};

export type CreateNotificationArgs = {
  data: {
    kind: SystemNotificationKind;
    severity?: NotificationSeverity;
    title: string;
    body?: string | null;
    payload?: unknown;
    targetUserId?: string | null;
    targetLevel?: AccessLevel | null;
  };
  select?: { id: true };
};

export type ListNotificationsArgs = {
  where: {
    OR?: Array<{
      targetUserId?: string;
      targetLevel?: AccessLevel;
    }>;
    readAt?: null;
  };
  orderBy?: { createdAt: "desc" | "asc" };
  take?: number;
};

export type CountNotificationsArgs = {
  where: ListNotificationsArgs["where"];
};

export type MarkReadArgs = {
  where: { id: { in: string[] }; readAt: null };
  data: { readAt: Date };
};

/**
 * Minimalt klient-grensesnitt. Produksjon sender inn Prisma-klienten;
 * tester sender inn en in-memory stub.
 */
export interface NotificationClient {
  systemNotification: {
    create(args: CreateNotificationArgs): Promise<{ id: string }>;
    findMany(args: ListNotificationsArgs): Promise<SystemNotificationRow[]>;
    count(args: CountNotificationsArgs): Promise<number>;
    updateMany(args: MarkReadArgs): Promise<{ count: number }>;
  };
}
