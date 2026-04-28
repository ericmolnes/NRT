import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveAccessForSession,
  resolveAccessForUser,
  resolveAccessLevel,
  type AccessDbClient,
  type AccessLevel,
} from "./get-current-access";

// ─── In-memory stub av AccessDbClient ────────────────────────────

type StubRow = {
  entraId?: string | null;
  email?: string | null;
  id: string;
  level: AccessLevel;
};

type StubState = { findFirstCalls: number };

function createDbStub(rows: StubRow[] = []): {
  client: AccessDbClient;
  state: StubState;
} {
  const state: StubState = { findFirstCalls: 0 };
  const client: AccessDbClient = {
    userAccess: {
      async findFirst(args) {
        state.findFirstCalls++;
        for (const filter of args.where.OR) {
          for (const row of rows) {
            if (filter.entraId && row.entraId === filter.entraId) {
              return { id: row.id, level: row.level };
            }
            if (filter.email && row.email === filter.email) {
              return { id: row.id, level: row.level };
            }
          }
        }
        return null;
      },
    },
  };
  return { client, state };
}

// ─── Tester for ren resolveAccessLevel-funksjon ───────────────────
//
// Vi tester den rene funksjonen som tar inn data eksplisitt. DB-wrapperen
// `getCurrentAccess` testes ikke her — den koples mot ekte session/Prisma.

test("resolveAccessLevel returnerer MINIMUM når ingen rad, e-post eller gruppe matcher", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: "ny@example.com",
    groups: [],
    bootstrapEmails: [],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.userAccessId, null);
  assert.equal(result.source, "FALLBACK");
});

test("resolveAccessLevel returnerer MINIMUM når raden har level=MINIMUM", () => {
  const result = resolveAccessLevel({
    userAccessRow: { id: "ua_1", level: "MINIMUM" },
    email: "x@example.com",
    groups: [],
    bootstrapEmails: [],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.userAccessId, "ua_1");
  assert.equal(result.source, "DATABASE");
});

test("resolveAccessLevel returnerer USER når raden har level=USER", () => {
  const result = resolveAccessLevel({
    userAccessRow: { id: "ua_2", level: "USER" },
    email: "user@example.com",
    groups: [],
    bootstrapEmails: [],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "USER");
  assert.equal(result.userAccessId, "ua_2");
  assert.equal(result.source, "DATABASE");
});

test("resolveAccessLevel returnerer ADMIN når raden har level=ADMIN", () => {
  const result = resolveAccessLevel({
    userAccessRow: { id: "ua_3", level: "ADMIN" },
    email: "admin@example.com",
    groups: [],
    bootstrapEmails: [],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "ADMIN");
  assert.equal(result.userAccessId, "ua_3");
  assert.equal(result.source, "DATABASE");
});

test("resolveAccessLevel returnerer ADMIN via bootstrap-e-post (case-insensitive) uten rad", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: "Eric@NordicRigTech.com",
    groups: [],
    bootstrapEmails: ["eric@nordicrigtech.com"],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "ADMIN");
  assert.equal(result.userAccessId, null);
  assert.equal(result.source, "BOOTSTRAP_EMAIL");
});

test("resolveAccessLevel returnerer ADMIN via bootstrap-gruppe uten rad", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: "noen@example.com",
    groups: ["group-xyz", "admin-grp"],
    bootstrapEmails: [],
    bootstrapGroupId: "admin-grp",
  });

  assert.equal(result.level, "ADMIN");
  assert.equal(result.userAccessId, null);
  assert.equal(result.source, "BOOTSTRAP_GROUP");
});

test("resolveAccessLevel returnerer MINIMUM når ingen rad og hverken e-post eller gruppe matcher", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: "nobody@example.com",
    groups: ["random-group"],
    bootstrapEmails: ["other@example.com"],
    bootstrapGroupId: "admin-grp",
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.userAccessId, null);
  assert.equal(result.source, "FALLBACK");
});

test("DATABASE-rad har forrang over bootstrap-e-post", () => {
  // Selv om e-posten er i bootstrap-listen skal raden være autoritativ.
  // Når en bruker er nedgradert i databasen skal vi respektere det,
  // ellers ville en bruker aldri kunnet fjernes som admin.
  const result = resolveAccessLevel({
    userAccessRow: { id: "ua_locked", level: "MINIMUM" },
    email: "eric@nordicrigtech.com",
    groups: [],
    bootstrapEmails: ["eric@nordicrigtech.com"],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.userAccessId, "ua_locked");
  assert.equal(result.source, "DATABASE");
});

test("DATABASE-rad har forrang over bootstrap-gruppe", () => {
  const result = resolveAccessLevel({
    userAccessRow: { id: "ua_locked2", level: "USER" },
    email: "u@example.com",
    groups: ["admin-grp"],
    bootstrapEmails: [],
    bootstrapGroupId: "admin-grp",
  });

  assert.equal(result.level, "USER");
  assert.equal(result.userAccessId, "ua_locked2");
  assert.equal(result.source, "DATABASE");
});

test("resolveAccessLevel håndterer null e-post (ingen e-post i sesjonen)", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: null,
    groups: [],
    bootstrapEmails: ["eric@nordicrigtech.com"],
    bootstrapGroupId: null,
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.userAccessId, null);
  assert.equal(result.source, "FALLBACK");
});

test("resolveAccessLevel ignorerer tom bootstrapGroupId", () => {
  const result = resolveAccessLevel({
    userAccessRow: null,
    email: "x@example.com",
    groups: [""],
    bootstrapEmails: [],
    bootstrapGroupId: "",
  });

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.source, "FALLBACK");
});

// ─── Tester for resolveAccessForSession (DB + ren regel) ─────────
//
// Helperen kombinerer DB-oppslag med den rene regelfunksjonen. Vi verifiserer
// at den komponerer korrekt: når DB returnerer en rad skal resultatet bli
// identisk med å kalle resolveAccessLevel direkte med samme rad. Når DB
// returnerer null skal vi falle gjennom til bootstrap/fallback.

test("resolveAccessForSession returnerer DATABASE-resultat når raden finnes (entraId)", async () => {
  const { client, state } = createDbStub([
    { entraId: "entra_abc", email: "u@example.com", id: "ua_1", level: "USER" },
  ]);

  const result = await resolveAccessForSession(
    { entraId: "entra_abc", email: "u@example.com", groups: [] },
    client
  );

  assert.equal(result.level, "USER");
  assert.equal(result.userAccessId, "ua_1");
  assert.equal(result.source, "DATABASE");
  assert.equal(state.findFirstCalls, 1);
});

test("resolveAccessForSession komponerer identisk med resolveAccessLevel", async () => {
  // Den nye helperen er bare en komposisjon av DB-oppslag + ren regel.
  // For samme rad og samme bootstrap skal resultatet være identisk med å
  // kalle den rene funksjonen direkte.
  const row = { id: "ua_42", level: "ADMIN" as const };
  const { client } = createDbStub([
    { entraId: "x", email: "a@b.no", id: row.id, level: row.level },
  ]);

  const fromHelper = await resolveAccessForSession(
    { entraId: "x", email: "a@b.no", groups: [] },
    client
  );

  const fromPure = resolveAccessLevel({
    userAccessRow: row,
    email: "a@b.no",
    groups: [],
    bootstrapEmails: [],
    bootstrapGroupId: null,
  });

  assert.deepEqual(fromHelper, fromPure);
});

test("resolveAccessForSession faller gjennom til FALLBACK når DB returnerer null", async () => {
  // Tom DB, ingen bootstrap-match. Helperen skal gi MINIMUM/FALLBACK.
  const { client, state } = createDbStub([]);
  const prevEmails = process.env.ADMIN_EMAILS;
  const prevGroupId = process.env.ADMIN_GROUP_ID;
  process.env.ADMIN_EMAILS = "";
  process.env.ADMIN_GROUP_ID = "";

  try {
    const result = await resolveAccessForSession(
      { entraId: "ny", email: "ny@example.com", groups: [] },
      client
    );

    assert.equal(result.level, "MINIMUM");
    assert.equal(result.userAccessId, null);
    assert.equal(result.source, "FALLBACK");
    assert.equal(state.findFirstCalls, 1);
  } finally {
    process.env.ADMIN_EMAILS = prevEmails;
    process.env.ADMIN_GROUP_ID = prevGroupId;
  }
});

test("resolveAccessForSession plukker opp bootstrap-e-post når DB returnerer null", async () => {
  const { client } = createDbStub([]);
  const prev = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "boot@example.com";

  try {
    const result = await resolveAccessForSession(
      { entraId: null, email: "boot@example.com", groups: [] },
      client
    );

    assert.equal(result.level, "ADMIN");
    assert.equal(result.userAccessId, null);
    assert.equal(result.source, "BOOTSTRAP_EMAIL");
  } finally {
    process.env.ADMIN_EMAILS = prev;
  }
});

test("resolveAccessForSession bygger ikke OR-filter når både entraId og email er null", async () => {
  // Når vi ikke har noen identifikator skal vi heller ikke spørre databasen.
  // findUserAccessRow returnerer null tidlig — DB-stuben skal aldri kalles.
  const { client, state } = createDbStub([]);
  const prevEmails = process.env.ADMIN_EMAILS;
  const prevGroupId = process.env.ADMIN_GROUP_ID;
  process.env.ADMIN_EMAILS = "";
  process.env.ADMIN_GROUP_ID = "";

  try {
    const result = await resolveAccessForSession(
      { entraId: null, email: null, groups: [] },
      client
    );

    assert.equal(result.level, "MINIMUM");
    assert.equal(result.source, "FALLBACK");
    assert.equal(state.findFirstCalls, 0, "DB skal ikke spørres uten id eller e-post");
  } finally {
    process.env.ADMIN_EMAILS = prevEmails;
    process.env.ADMIN_GROUP_ID = prevGroupId;
  }
});

// ─── Tester for resolveAccessForUser (short-circuit) ─────────────

test("resolveAccessForUser short-circuiter når sesjonen allerede er beriket", async () => {
  // Sesjon med accessLevel og userAccessId allerede satt — skal returnere
  // direkte uten å konsultere DB. Verifiser med en spy på DB-stuben.
  const { client, state } = createDbStub([
    { entraId: "x", email: "y@z.no", id: "ua_other", level: "ADMIN" },
  ]);

  const result = await resolveAccessForUser(
    {
      id: "x",
      email: "y@z.no",
      groups: [],
      accessLevel: "USER",
      userAccessId: "ua_123",
    },
    client
  );

  assert.equal(result.level, "USER");
  assert.equal(result.userAccessId, "ua_123");
  assert.equal(result.source, "SESSION_CACHE");
  assert.equal(
    state.findFirstCalls,
    0,
    "DB findFirst skal IKKE bli kalt når sesjonen er beriket"
  );
});

test("resolveAccessForUser short-circuiter også for bootstrap-admin med userAccessId=null", async () => {
  // Bootstrap-admin har accessLevel=ADMIN men userAccessId=null. Short-circuit
  // skal fortsatt slå inn — vi vil ikke gjøre et nytt DB-oppslag bare fordi
  // brukeren ikke har en rad ennå.
  const { client, state } = createDbStub([]);

  const result = await resolveAccessForUser(
    {
      id: "boot",
      email: "boot@example.com",
      groups: [],
      accessLevel: "ADMIN",
      userAccessId: null,
    },
    client
  );

  assert.equal(result.level, "ADMIN");
  assert.equal(result.userAccessId, null);
  assert.equal(result.source, "SESSION_CACHE");
  assert.equal(state.findFirstCalls, 0);
});

test("resolveAccessForUser slår opp DB når accessLevel mangler", async () => {
  // Sesjon uten accessLevel (f.eks. session-callbacken har ikke kjørt) —
  // skal slå opp via DB-stuben.
  const { client, state } = createDbStub([
    { entraId: "x", email: "y@z.no", id: "ua_real", level: "USER" },
  ]);

  const result = await resolveAccessForUser(
    { id: "x", email: "y@z.no", groups: [] },
    client
  );

  assert.equal(result.level, "USER");
  assert.equal(result.userAccessId, "ua_real");
  assert.equal(result.source, "DATABASE");
  assert.equal(state.findFirstCalls, 1);
});

test("resolveAccessForUser returnerer FALLBACK når user er null", async () => {
  const { client, state } = createDbStub([]);

  const result = await resolveAccessForUser(null, client);

  assert.equal(result.level, "MINIMUM");
  assert.equal(result.source, "FALLBACK");
  assert.equal(state.findFirstCalls, 0);
});
