# Handover — Plattform-sammenheng, Task 7 og 8

Status etter økt 2026-04-28. Hovedplanen ligger i [`2026-04-28-plattform-sammenheng-subagenter.md`](./2026-04-28-plattform-sammenheng-subagenter.md). Tidligere handover-tråden ligger i den opprinnelige sesjons-oppgaven (kontrakt-konteksten med pending data-backbone).

## Kort sammendrag

Tasks 1-6 er ferdig. 14 atomiske commits er landet på `main` i `apps/nrt`. Dataryggen som du sa måtte være på plass før AI-chat — endringslogg, tilgangsmodell i database, varsling, sync-konfliktdeteksjon — er fullført. Tasks 7 (AI-assistent) og 8 (kursdokument-uttrekk) står att og er klare for spec-fasen.

## Commits per task

Base SHA: `ba8dbb3 fix(innleide/skjema): vis orphan-innleide i skjema-picker`. Alle commits under bygger på denne.

### Task 1 — Foundation Schema And Change Backbone (4 commits)

- `d0be968 feat(foundation): databasemodeller og endringslogg-helpere`
- `c6bf63d fix(change-log): støtt rollback via runId`
- `f046255 fix(change-log): atomisk recordChange og rollback i transaksjon`
- `731b1a5 perf(schema): legg til indeks for rullback og downstream-spørringer`

Leverer 7 nye Prisma-modeller (UserAccess, AccessRequest, SystemNotification, ChangeLog, ChangeLogEntry, SyncConflict, AiActionRun), 11 enums, 5 indekser. Helper-modul `src/lib/change-log/` med `recordChange` og `rollbackChange` som begge kjører inni `$transaction` mot et `ChangeLogClient`-grensesnitt (lar tester stubbe Prisma).

### Task 2 — Access Control And Minimum Access (4 commits)

- `1002aae feat(access): tilgangsnivå i database med MINIMUM-fallback`
- `5f6e54b fix(api): krev User-tilgang for lese-endepunkter`
- `a6aae2d refactor(access): single auth() per request og delt resolver`
- `37aecc3 fix(access): atomisk approve/deny og race-trygg requestAccess`

Database-drevet tilgangsmodell (MINIMUM/USER/ADMIN). Ny bruker → `Minimum` → redirect til `/waiting-access` → automatisk `AccessRequest`. Admin-godkjenning/avslag i settings, atomisk via `db.$transaction` med eksplisitt status-transition-sjekk (`updateMany`-pattern mot TOCTOU). Bootstrap fra `ADMIN_EMAILS`/`ADMIN_GROUP_ID` beholdes til første admin-rad er opprettet. Session-callback har try/catch med fallback til pure-resolver hvis Neon er nede.

API-ruter krever `requireUser()`/`requireAdmin()` (returnerer `{ ok, session, access } | { ok, status, reason }`). Holdt unna ble `/api/auth/...`, `/api/cron/sync` (CRON_SECRET-guarded) og `/api/form-auth/verify-password` (token-guarded).

### Task 3 — Unified Personnel Domain (3 commits)

- `9efa963 feat(personell): unifiser kategorier rundt felles helper og overgang`
- `010c58a feat(personell): unifiser listevisninger via getPersonnelishList`
- `37df418 fix(personell): hard innleid-overgang, audit-symmetri og admin-gate`

Kategori-helper `src/lib/personell/category.ts` — pure `resolveCategory(input)` + `buildCategoryWhere(category, now)` for Prisma-where-fragment. `transitionCategory(ref, to, opts)` håndterer overgang KANDIDAT↔INNLEID, åpner/lukker ContractorPeriod, skriver ChangeLog manuelt inni tx, avviser `to: ANSATT` (RecMan-styrt) og `from: ANSATT` (krever `removeEmployment`-flyt).

`getPersonnelishList(filters)` i `src/lib/queries/personnel-list.ts` returnerer `PersonnelishRow[]` som unifiserer Personnel-rader OG RecmanCandidate-only-rader (kandidater uten Personnel-link). To-fase-spørring + `mergeRows` med dedup på `recmanCandidateId`. ID-prefiks `rc:` for RECMAN_ONLY.

`removeEmployment` skriver to ChangeLog-entries (RecmanCandidate.employeeEnd + RecmanCandidate.category), så audit-trailen er konsistent med `transitionCategory`.

**Deferred concerns:**

- Hovedsiden `/personell` bruker fortsatt `getPersonnelList` (legacy) fordi `personnel-list.tsx` har en `status: string`-prop som ikke finnes på `PersonnelishRow`. Fix: drop ubrukt `status`-prop, type-bytte til `PersonnelishRow`, slett `getPersonnelList`. Trivielt.
- **Step 6 / profil-shell-unifisering ikke gjort.** `personnel-card-tabs.tsx` har fjernet sin `linkedSystems.recman`-gating, men kandidat-detalj og innleid-detalj bruker fortsatt `candidate-detail.tsx` som er en helt egen profil. Bør samles.
- **Race på ContractorPeriod.create ikke helt lukket.** App-nivå count-assertion fanger duplikater når andre tx commiter først, men ikke når begge tx kjører helt parallelt. Full closure: legg til partial unique index `WHERE endDate IS NULL` via raw SQL i ny Prisma-migrering. Sannsynlighet for race er liten (krever to admin-klikk på sekundnivå mot samme kandidat), men det er ekte.

### Task 4 — Forms, Filters And Evaluation Cohesion (1 commit)

- `1f0e510 feat(skjema): kategori- og avdelingsfilter på lenker`

`EvaluationLink` har nye felt `categoriesFilter Json?` og `departmentsFilter Json?`. Ny modul `src/lib/forms/link-filters.ts` med `parseLinkFilters` (legacy `roleFilter` mappes inn), `isPersonAllowed`, `toPersonnelListFilters`. Public form filtrerer person-picker server-side via `getPersonnelForLinkFilters` i `evaluations.ts`. Create-link-UI har multi-select for kategori og avdeling med live filter-preview.

**Deferred concerns:**

- **Public picker viser kun Personnel-koblede rader.** Kandidater uten Personnel-link kan ikke evalueres, fordi `Evaluation.personnelId` er required. Pre-eksisterende grense, ikke regresjon. Hvis det skal fikses må enten Evaluation-schema endres eller det må auto-opprettes Personnel ved evaluering.
- **Schema-endring er ikke pushet til Neon.** Når denne grenen merges, kjør `npx prisma db push` i prod.
- **Datamigrering av legacy `roleFilter`-rader** er ikke gjort. Eksisterende rader virker via fallback i `parseLinkFilters`. Lag eit ad-hoc-script senere som kopierer `roleFilter → categoriesFilter` og dropper kolonnen.

### Task 5 — Notifications And Access Requests (1 commit)

- `f9eaeb7 feat(varsler): in-app + e-post for tilgangsforespørsler`

Ny modul `src/lib/notifications/` med `createNotification`, `listNotificationsForUser`, `countUnreadForUser`, `markAsRead`, `sendAccessRequestEmail`. E-post bruker dynamisk `await import("nodemailer").catch(() => null)` så `nodemailer` ikke trenger å være installert. Hvis SMTP-env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_TO_ADMIN`) ikke er satt, logger og skipper uten å throwe — innlogging fungerer fortsatt.

`<NotificationBell />` i header viser uleste teller + dropdown med siste 20. Server-fetcher data via slot fra `(authenticated)/layout.tsx`. `<NotificationsPanel />` i settings/admin viser fullstendig liste.

`approveAccessRequest`/`denyAccessRequest` sender bruker-rettet varsel når `request.entraId` er kjent.

**Deferred concerns:**

- **Bjellen oppdaterer ikke live** (ingen polling/SSE). Refresh ved navigation.
- **`nodemailer` er ikke i dependencies.** For å aktivere e-post: `pnpm add nodemailer @types/nodemailer` i apps/nrt + sett env-variablene.
- **`NotificationClient` cast som `as unknown as NotificationClient`** flere steder (samme mønster som change-log). Smal grenseflate, men runtime-feil hvis Prisma-API endres.

### Task 6 — Sync Queue, Conflict Detection And Recovery (1 commit)

- `ee16d0e feat(sync): konfliktoppdaging og kø-resultater per sync-runde`

Ny modul `src/lib/sync/`:

- `conflict-detector.ts:diagnoseFields(input)` — pure-funksjon som klassifiserer hvert felt som `no_change | remote_only | local_only | conflict | missing_link` basert på `local`/`remote`/`base`-trippelet.
- `sync-queue.ts:processSyncDiagnosis(client, input)` — anvender safe-remote, oppretter `SyncConflict`-rader for konflikter, teller pending-push og missing-link.
- `sync-queue.ts:notifySyncResult` — `SYNC_CONFLICT`-varsel mot ADMIN-nivå når `conflicts > 0` eller `missingLink > 0`.
- `sync-queue.ts:mergeSyncResults` — aggregerer flere `SyncResult` per sync-kjøring.

Instrumentert: `src/lib/poweroffice/sync-employees.ts` (bruker `POEmployee.rawJson` som base-snapshot), pluss `recman/sync.ts` og `poweroffice/sync.ts` på top-nivå. Sync-knapper og actions returnerer `{message, conflicts: SyncResult, ...}`.

**Deferred concerns:**

- **RecmanCandidate-sync er IKKE konflikt-instrumentert** fordi modellen mangler en `rawJson`-snapshot å sammenligne mot. To valg:
  - (a) Legg til `lastSyncedRawJson Json?` til `RecmanCandidate` i schema, hvor sync-laget skriver remote-payload før upsert.
  - (b) Behold blind upsert for kandidater til en egen "kandidat-konflikt-fase" senere.
- **Andre PowerOffice-sync-paths** (`sync-customers`, `sync-invoices`, `sync-projects`) er fortsatt blind upsert. De er i pre-eksisterende dirty worktree (ikke mitt scope) og må instrumenteres separat når de stabiliseres.
- **Pending push** loggføres som teller, men selve push-mekanismen til RecMan/PowerOffice er ikke bygget.

## Skitten worktree status

Alle commits over rører kun filer som er en del av Task-write-settene. Pre-eksisterende dirty filer er urørt:

- `middleware.ts` (type-tightening)
- `src/app/(authenticated)/kunder/[id]/actions.ts`
- `src/app/(authenticated)/prosjekter/[id]/actions.ts`
- `src/components/layout/app-sidebar.tsx` (active-nav)
- `src/lib/poweroffice/config.ts`, `sync-customers.ts`, `sync-invoices.ts`, `sync-projects.ts`
- `src/lib/tools-registry.ts`
- `tsconfig.json`
- Untracked: `AGENTS.md`, `eslint.config.mjs`, `src/lib/forms/dynamic-fields.ts/test.ts`, `src/lib/personell/candidate-data.ts/test.ts`, `src/lib/poweroffice/config.test.ts`, `src/lib/recman/sync-jobs.test.ts`, `src/lib/tools-registry.test.ts`

Commits inkluderte i de tilfellene write-settet overlappet med dirty-filer (auth.config.ts, auth.ts, app-header.tsx, sync-employees.ts) — dokumentert i hver commit-melding.

## Tasks 7 og 8 — åpne produktvalg

Før implementasjon må disse låses i en `AI-SPEC.md`. Bruk `/gsd-ai-integration-phase` (eller fri brainstorming) for å nagle dem:

### Task 7 — AI Assistant Shell And Action Layer

**Modell:** `claude-opus-4-6-20250219` (bekreftet av Eric 2026-04-28). Allerede default i [`get-ai-model.ts:3`](../../../../apps/nrt/src/lib/ai/get-ai-model.ts#L3). Ingen endring nødvendig.

**Modus-semantikk** (planen lister `Plan / Ask before edits / Auto / Admin/Bypass` — må gjøres konkret):

- Skal v1 ha alle fire, eller bare "Ask before edits"?
- Hvis Auto: hvor mange handlinger i rekkefølge uten bekreftelse? Tidsvindu?
- Hvis Admin/Bypass: hvilke handlinger får hoppe over bekreftelse?

**Capability/handlingsmatrise** — hvilke serverfunksjoner får AI-en kalle? Forslag:

| Handling | Krav | Logges som |
|----------|------|------------|
| Lese personell, kunder, prosjekter | USER | (ingen — read-only) |
| Opprette notat på person | USER | ChangeLog: model=Note, field=content |
| Endre rolle/avdeling på person | USER | ChangeLog: model=Personnel, field=role/department |
| `transitionCategory` (kandidat ↔ innleid) | USER | ChangeLog: field=category |
| Godkjenne tilgangsforespørsel | ADMIN | ChangeLog: model=AccessRequest |
| Løse sync-konflikt (LOCAL_WINS/REMOTE_WINS/IGNORE) | ADMIN | ChangeLog + SyncConflict.status |
| Endre rolle på UserAccess | ADMIN | ChangeLog: model=UserAccess, field=level |
| Slette en evaluering | (ikke tillatt i v1) | — |
| Filoperasjoner (SharePoint via mcp-microsoft) | (ikke tillatt i v1) | — |
| Kode-/git-operasjoner | (aldri tillatt) | — |

**Sync-review-panel:** Når en sync produserer konflikter (Task 6), skal panelet:
- Liste konflikter med kort AI-forklaring per ("Lokalt heter Eric Molnes 'Konsernsjef', i RecMan står 'CEO'. Som regel beholder vi norske titler — anbefaler LOCAL_WINS")
- Bruker velger LOCAL_WINS / REMOTE_WINS / IGNORE per konflikt eller batch
- Bekreftelse → AI kaller `resolveConflict(...)` på alle, hver med ChangeLog
- Hvis bruker setter mode til Auto, kan AI auto-resolve "trygge" konflikter (case-only forskjeller, whitespace) og spørre om resten

**Eval/test:**
- Capability-resolusjon (USER vs ADMIN handler)
- AI-en kan ikke kalle `requireAdmin`-handlinger som USER
- AI-handling logger til ChangeLog med `actorType: "AI"`
- Rollback av AI-batch via `runId`-felt på ChangeLog

**Andre spørsmål:**
- Hvor lever chat-historikken? Egen `AiThread` + `AiMessage`-modeller eller er det inni `AiActionRun.payload`?
- Hvor mye kontekst skal AI-en få? (system prompt med tilgangsnivå + nåværende bruker + relevant data?)
- Skal AI-en ha tilgang til Microsoft Graph (epost, kalendar) via mcp-microsoft? Sannsynligvis NEI i v1.
- Skal AI-en kunne sende e-post (`createNotification` finnes — kan det misbrukes)?

### Task 8 — Course Documents And AI Extraction

**Avhengighet:** Bygger på Task 7 (AI-assistent-shell). Bør ikke startes før 7 er låst.

**Dokumenttyper:**
- PDF kursbevis
- Fagbrev / svennebrev
- Sertifikat (ulike typer — Isovator, F-gass, sveising, m.m.)
- Andre dokumenter (CV, ID, kontrakt)?

**Parser-strategi:**
- Anthropic-prompt med PDF som vedlegg (krever Files API eller base64 i melding)?
- `mammoth` for Word-dokumenter + parse på tekst?
- OCR for skanna PDF-er? (`tesseract.js` eller eksternt API?)

**Flyt:**
- Bruker laster opp dokument til en personprofil
- AI leser → foreslår `{ kursnavn, dato, gyldigUtløp, leverandør, ... }` som JSON
- Forslag vises som ferdig-utfylt skjema; bruker bekrefter eller redigerer
- Lagring oppretter en `CompetenceRecord` (eller utvider eksisterende dokument-modell)

**Schema:** Vurder om `Document`-modellen (allerede eksisterende) kan kobles til Personnel og berikes med strukturert kompetanseinfo, eller om det trengs en separat `PersonnelDocument` + `CompetenceRecord`.

**Eval:**
- Test mot et sett av kjente dokumenter med fasit
- Måle precision/recall på felt-uttrekk
- Confidence score på AI-forslag — hvis lav, ikke pre-fyll

## Vault-status (fra denne økten)

To /save-vault-operasjoner kjørte:

1. **Adresseflytting:** Alle Nevy-selskap nå på Kokstadvegen 41, 5257 Kokstad. Oppdatert i `Nevy Group AS/Om selskapet.md`, `Nevy Varmepumper AS/Om selskapet.md`, og `entity-registry.json` (fields `nevy-vp.om`, `nevy-group.om`, `nevy.om`). Basisdata-tabellen i `Nevy Group AS/Om selskapet.md` har fortsatt gammel adresse — bør fikses manuelt etter Brønnøysund-registrering.
2. **Steffen-inbox:** Notat ved `06 - Læring og refleksjon/_inbox/2026-04-28 - Steffen Bergen-leilegheit og Skånevik-avdeling.md`. Nevy bygger Skånevik-avdeling, Steffen jobber i Bergen i mellomtiden, firma dekker leilighet. Anbefaling om kontraktfesting (skattepliktig naturalytelse + aml. § 14-6 + avgrensning av forventninger). Manglende info: etternavn, hvilket Nevy-selskap, dato, stilling.

## Anbefalt fremgangsmåte for neste økt

1. **Sjekk gjeldende status:** `cd apps/nrt && git log --oneline ba8dbb3..HEAD` skal vise de 14 commitsne over.
2. **Kjør `/gsd-ai-integration-phase`** med Task 7 fra hovedplanen som input. Det vil generere et `AI-SPEC.md` som låser modus-semantikk, capability-matrise, eval-strategi og kostnadsrammer.
3. **Brukerinput trengs på:**
   - Hvilke modi i v1 (Ask-only, eller alle fire)
   - Hva betyr Auto-modus konkret (antall handlinger, tidsvindu)
   - Skal AI få lov å sende e-post via `createNotification`?
   - Hvor mye Microsoft Graph (mcp-microsoft) skal AI kunne røre?
   - Forventet kostnad per måned (gir grenseverdi for `AiActionRun.cost`)
4. **Etter spec er låst:** Kjør `/subagent-driven-development` mot Task 7. Foreslår å holde lavere review-rigor enn Tasks 1-3 — mønstrene er etablerte.
5. **Task 8 etterpå:** Når Task 7 har AI-shell + capability-layer på plass, er Task 8 et tillegg av dokument-uttrekk-flyt på toppen av samme infrastruktur.

## Kjente baseline-test-tellinger (regression check før Tasks 7-8 startes)

`pnpm exec tsx --test src/lib/access/get-current-access.test.ts src/lib/change-log/record-change.test.ts src/lib/change-log/rollback-change.test.ts src/lib/forms/link-filters.test.ts src/lib/forms/personnel-access.test.ts src/lib/notifications/create-notification.test.ts src/lib/personell/category.test.ts src/lib/queries/personnel-list.test.ts src/lib/sync/conflict-detector.test.ts src/lib/sync/sync-queue.test.ts`

skal gi **145/145 pass** (16 access + 17 change-log + 28 forms + 18 notifications + 11 category + 14 personnel-list + 13 sync-detector + 10 sync-queue + 11 personnel + 7 sync-jobs).

`pnpm build` skal gi grønn produksjonsbygg, 49 ruter.
