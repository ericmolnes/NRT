import assert from "node:assert/strict";
import test from "node:test";

import { createNotification } from "./create-notification";
import {
  countUnreadForUser,
  listNotificationsForUser,
  markAsRead,
} from "./list-notifications";
import {
  sendAccessRequestEmailWithTransport,
  type EmailTransport,
} from "./send-access-request-email";
import type {
  CreateNotificationArgs,
  ListNotificationsArgs,
  CountNotificationsArgs,
  MarkReadArgs,
  NotificationClient,
  SystemNotificationRow,
} from "./types";

// ─── In-memory stub av NotificationClient ───────────────────────────

type StubState = {
  rows: SystemNotificationRow[];
  nextId: number;
  createCalls: CreateNotificationArgs[];
};

function createStub(): { client: NotificationClient; state: StubState } {
  const state: StubState = {
    rows: [],
    nextId: 1,
    createCalls: [],
  };

  const client: NotificationClient = {
    systemNotification: {
      async create(args: CreateNotificationArgs) {
        state.createCalls.push(args);
        const row: SystemNotificationRow = {
          id: `n_${state.nextId++}`,
          kind: args.data.kind,
          severity: args.data.severity ?? "INFO",
          title: args.data.title,
          body: args.data.body ?? null,
          payload: args.data.payload ?? null,
          targetUserId: args.data.targetUserId ?? null,
          targetLevel: args.data.targetLevel ?? null,
          readAt: null,
          createdAt: new Date(`2026-04-28T10:00:0${state.nextId}Z`),
        };
        state.rows.push(row);
        return { id: row.id };
      },
      async findMany(args: ListNotificationsArgs) {
        let rows = state.rows.slice();
        const where = args.where ?? {};
        if (where.OR && where.OR.length > 0) {
          rows = rows.filter((row) =>
            where.OR!.some((branch) => {
              if (branch.targetUserId !== undefined) {
                return row.targetUserId === branch.targetUserId;
              }
              if (branch.targetLevel !== undefined) {
                return row.targetLevel === branch.targetLevel;
              }
              return false;
            })
          );
        }
        if (where.readAt === null) {
          rows = rows.filter((row) => row.readAt === null);
        }
        rows.sort(
          (a, b) =>
            (args.orderBy?.createdAt === "asc" ? 1 : -1) *
            (a.createdAt.getTime() - b.createdAt.getTime())
        );
        if (typeof args.take === "number") {
          rows = rows.slice(0, args.take);
        }
        return rows;
      },
      async count(args: CountNotificationsArgs) {
        const rows = await client.systemNotification.findMany({
          where: args.where,
        });
        return rows.length;
      },
      async updateMany(args: MarkReadArgs) {
        let count = 0;
        for (const row of state.rows) {
          const audienceMatches =
            !args.where.OR ||
            args.where.OR.length === 0 ||
            args.where.OR.some((branch) => {
              if (branch.targetUserId !== undefined) {
                return row.targetUserId === branch.targetUserId;
              }
              if (branch.targetLevel !== undefined) {
                return row.targetLevel === branch.targetLevel;
              }
              return false;
            });

          if (
            args.where.id.in.includes(row.id) &&
            args.where.readAt === null &&
            row.readAt === null &&
            audienceMatches
          ) {
            row.readAt = args.data.readAt;
            count++;
          }
        }
        return { count };
      },
    },
  };

  return { client, state };
}

// ─── createNotification ────────────────────────────────────────────

test("createNotification skriver alle felter til DB", async () => {
  const { client, state } = createStub();

  const result = await createNotification(client, {
    kind: "ACCESS_REQUEST",
    severity: "WARNING",
    title: "Ny tilgangsforespørsel fra Eric Molnes",
    body: "eric@nordicrigtech.com",
    payload: { requestId: "req_1", email: "eric@nordicrigtech.com" },
    targetLevel: "ADMIN",
  });

  assert.equal(state.rows.length, 1);
  const row = state.rows[0];
  assert.equal(row.id, result.id);
  assert.equal(row.kind, "ACCESS_REQUEST");
  assert.equal(row.severity, "WARNING");
  assert.equal(row.title, "Ny tilgangsforespørsel fra Eric Molnes");
  assert.equal(row.body, "eric@nordicrigtech.com");
  assert.deepEqual(row.payload, {
    requestId: "req_1",
    email: "eric@nordicrigtech.com",
  });
  assert.equal(row.targetLevel, "ADMIN");
  assert.equal(row.targetUserId, null);
  assert.equal(row.readAt, null);
});

test("createNotification kaster når både targetUserId og targetLevel mangler", async () => {
  const { client } = createStub();

  await assert.rejects(
    () =>
      createNotification(client, {
        kind: "GENERIC",
        title: "Ingen mottaker",
      }),
    /krever målgruppe/i
  );
});

test("createNotification defaulter severity til INFO", async () => {
  const { client, state } = createStub();

  await createNotification(client, {
    kind: "GENERIC",
    title: "Hei",
    targetUserId: "user_42",
  });

  assert.equal(state.rows[0].severity, "INFO");
});

test("createNotification godtar JSON-serialiserbar payload", async () => {
  const { client, state } = createStub();

  const payload = {
    nested: { tags: ["a", "b"], n: 1 },
    flag: true,
    nul: null,
  };

  await createNotification(client, {
    kind: "AI_ACTION",
    title: "AI har forslag",
    targetUserId: "user_1",
    payload,
  });

  assert.deepEqual(state.rows[0].payload, payload);
});

test("createNotification godtar bare targetUserId", async () => {
  const { client, state } = createStub();

  await createNotification(client, {
    kind: "GENERIC",
    title: "Direkte til deg",
    targetUserId: "user_42",
  });

  assert.equal(state.rows[0].targetUserId, "user_42");
  assert.equal(state.rows[0].targetLevel, null);
});

test("createNotification kaster ved ugyldig kind", async () => {
  const { client } = createStub();

  await assert.rejects(
    () =>
      createNotification(client, {
        // @ts-expect-error — runtime-validering
        kind: "ROBOT_INVASION",
        title: "Hei",
        targetLevel: "ADMIN",
      }),
    /Ugyldig notification-kind/
  );
});

test("createNotification kaster ved tom title", async () => {
  const { client } = createStub();

  await assert.rejects(
    () =>
      createNotification(client, {
        kind: "GENERIC",
        title: "",
        targetLevel: "ADMIN",
      }),
    /title/
  );
});

// ─── listNotificationsForUser / countUnreadForUser ──────────────────

test("listNotificationsForUser returnerer både direkte og broadcast-varsler", async () => {
  const { client, state } = createStub();

  await createNotification(client, {
    kind: "GENERIC",
    title: "Direkte",
    targetUserId: "user_42",
  });
  await createNotification(client, {
    kind: "ACCESS_REQUEST",
    title: "Broadcast til admin",
    targetLevel: "ADMIN",
  });
  await createNotification(client, {
    kind: "GENERIC",
    title: "Annen bruker",
    targetUserId: "user_99",
  });

  const result = await listNotificationsForUser(client, {
    userId: "user_42",
    accessLevel: "ADMIN",
  });

  // Begge mine bør komme med, men ikke den til user_99.
  assert.equal(result.length, 2);
  const titles = result.map((r) => r.title).sort();
  assert.deepEqual(titles, ["Broadcast til admin", "Direkte"]);
  // Sanity: user_99-raden ble persistert men ikke returnert.
  assert.equal(state.rows.length, 3);
});

test("listNotificationsForUser uten userId returnerer bare broadcast", async () => {
  const { client } = createStub();

  await createNotification(client, {
    kind: "GENERIC",
    title: "Direkte",
    targetUserId: "user_42",
  });
  await createNotification(client, {
    kind: "ACCESS_REQUEST",
    title: "Broadcast",
    targetLevel: "ADMIN",
  });

  const result = await listNotificationsForUser(client, {
    userId: null,
    accessLevel: "ADMIN",
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].title, "Broadcast");
});

test("countUnreadForUser teller bare uleste i mottakergruppen", async () => {
  const { client, state } = createStub();

  await createNotification(client, {
    kind: "GENERIC",
    title: "A",
    targetUserId: "user_42",
  });
  await createNotification(client, {
    kind: "GENERIC",
    title: "B",
    targetLevel: "ADMIN",
  });
  await createNotification(client, {
    kind: "GENERIC",
    title: "C",
    targetUserId: "user_99",
  });

  // Marker A som lest direkte i stuben.
  state.rows[0].readAt = new Date();

  const count = await countUnreadForUser(client, {
    userId: "user_42",
    accessLevel: "ADMIN",
  });

  assert.equal(count, 1);
});

test("markAsRead markerer kun de spesifiserte ID-ene", async () => {
  const { client, state } = createStub();

  const a = await createNotification(client, {
    kind: "GENERIC",
    title: "A",
    targetUserId: "user_42",
  });
  const b = await createNotification(client, {
    kind: "GENERIC",
    title: "B",
    targetUserId: "user_42",
  });

  await markAsRead(client, [a.id], {
    userId: "user_42",
    accessLevel: "USER",
  });

  const aRow = state.rows.find((r) => r.id === a.id)!;
  const bRow = state.rows.find((r) => r.id === b.id)!;
  assert.notEqual(aRow.readAt, null);
  assert.equal(bRow.readAt, null);
});

test("markAsRead markerer bare varsler som tilhorer mottaker-scope", async () => {
  const { client, state } = createStub();

  const mine = await createNotification(client, {
    kind: "GENERIC",
    title: "Min",
    targetUserId: "user_42",
  });
  const adminBroadcast = await createNotification(client, {
    kind: "GENERIC",
    title: "Admin",
    targetLevel: "ADMIN",
  });
  const other = await createNotification(client, {
    kind: "GENERIC",
    title: "Annen",
    targetUserId: "user_99",
  });

  await markAsRead(client, [mine.id, adminBroadcast.id, other.id], {
    userId: "user_42",
    accessLevel: "ADMIN",
  });

  const mineRow = state.rows.find((r) => r.id === mine.id)!;
  const adminRow = state.rows.find((r) => r.id === adminBroadcast.id)!;
  const otherRow = state.rows.find((r) => r.id === other.id)!;

  assert.notEqual(mineRow.readAt, null);
  assert.notEqual(adminRow.readAt, null);
  assert.equal(otherRow.readAt, null);
});

test("markAsRead er idempotent (overskriver ikke gammelt readAt)", async () => {
  const { client, state } = createStub();

  const a = await createNotification(client, {
    kind: "GENERIC",
    title: "A",
    targetUserId: "user_42",
  });
  const original = new Date("2026-04-01T12:00:00Z");
  state.rows[0].readAt = original;

  await markAsRead(client, [a.id], {
    userId: "user_42",
    accessLevel: "USER",
  });

  assert.equal(state.rows[0].readAt!.getTime(), original.getTime());
});

test("markAsRead på tom liste er no-op", async () => {
  const { client } = createStub();
  await markAsRead(client, [], {
    userId: "user_42",
    accessLevel: "USER",
  }); // Skal ikke kaste eller røre noe
});

// ─── sendAccessRequestEmailWithTransport ────────────────────────────
//
// Vi tester lavnivå-funksjonen som tar transport eksplisitt, slik at vi
// slipper å mocke nodemailer/dynamic-import. Produksjons-wrapperen
// (`sendAccessRequestEmail`) er en tynn skive over dette.

test("sendAccessRequestEmailWithTransport returnerer skipped når config mangler", async () => {
  const result = await sendAccessRequestEmailWithTransport(
    null,
    { userName: "Eric", userEmail: "eric@example.com" },
    null
  );
  assert.equal(result.skipped, true);
  assert.equal(result.messageId, undefined);
});

test("sendAccessRequestEmailWithTransport returnerer skipped når transport mangler", async () => {
  const result = await sendAccessRequestEmailWithTransport(
    null,
    { userName: "Eric", userEmail: "eric@example.com" },
    {
      host: "smtp.example.com",
      port: 587,
      user: "u",
      pass: "p",
      from: "no-reply@example.com",
      toAdmin: "admin@example.com",
    }
  );
  assert.equal(result.skipped, true);
});

test("sendAccessRequestEmailWithTransport sender e-post når begge er satt", async () => {
  const sendMailCalls: Array<Parameters<EmailTransport["sendMail"]>[0]> = [];
  const transport: EmailTransport = {
    async sendMail(opts) {
      sendMailCalls.push(opts);
      return { messageId: "msg_1" };
    },
  };

  const result = await sendAccessRequestEmailWithTransport(
    transport,
    { userName: "Eric Molnes", userEmail: "eric@example.com" },
    {
      host: "smtp.example.com",
      port: 587,
      user: "u",
      pass: "p",
      from: "no-reply@example.com",
      toAdmin: "admin@example.com",
    }
  );

  assert.equal(result.skipped, false);
  assert.equal(result.messageId, "msg_1");
  assert.equal(sendMailCalls.length, 1);
  assert.equal(sendMailCalls[0].from, "no-reply@example.com");
  assert.equal(sendMailCalls[0].to, "admin@example.com");
  assert.match(sendMailCalls[0].subject, /Eric Molnes/);
  assert.match(sendMailCalls[0].text, /eric@example\.com/);
});

test("sendAccessRequestEmailWithTransport bruker overstyrt admin-adresse", async () => {
  const sendMailCalls: Array<Parameters<EmailTransport["sendMail"]>[0]> = [];
  const transport: EmailTransport = {
    async sendMail(opts) {
      sendMailCalls.push(opts);
      return { messageId: "msg_2" };
    },
  };

  await sendAccessRequestEmailWithTransport(
    transport,
    {
      userName: "Eric",
      userEmail: "eric@example.com",
      adminEmail: "override@example.com",
    },
    {
      host: "smtp.example.com",
      port: 587,
      user: "u",
      pass: "p",
      from: "no-reply@example.com",
      toAdmin: "admin@example.com",
    }
  );

  assert.equal(sendMailCalls[0].to, "override@example.com");
});

test("sendAccessRequestEmailWithTransport returnerer skipped + error når sendMail kaster", async () => {
  const transport: EmailTransport = {
    async sendMail() {
      throw new Error("SMTP unreachable");
    },
  };

  const result = await sendAccessRequestEmailWithTransport(
    transport,
    { userName: "Eric", userEmail: "eric@example.com" },
    {
      host: "smtp.example.com",
      port: 587,
      user: "u",
      pass: "p",
      from: "no-reply@example.com",
      toAdmin: "admin@example.com",
    }
  );

  assert.equal(result.skipped, true);
  assert.match(result.error ?? "", /SMTP unreachable/);
});
