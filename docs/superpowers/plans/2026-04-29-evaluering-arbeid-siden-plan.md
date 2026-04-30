# Evaluering - arbeid siden plattform-sammenheng-planen

Dato: 2026-04-29
Arbeidskatalog: `C:\Users\EricMolnes\Dev\apps\nrt`
Planreferanse: `docs/superpowers/plans/2026-04-28-plattform-sammenheng-subagenter.md`
Forrige handover: `docs/superpowers/plans/2026-04-29-handover-status-mot-plan.md`

## Kort konklusjon

Arbeidet siden den opprinnelige planen har flyttet repoet vesentlig framover. Tasks 1, 2, 4 og 5 er i praksis sterke nok til aa bygge videre paa, og Task 3 er betydelig bedre enn forrige handover antydet etter siste rydding i kategori- og evalueringsfilter.

Likevel er planen ikke "ferdig". Det viktigste gjenvaarende gapet er Task 6: konfliktmodellen finnes og har gode enhetstester, men RecMan-kandidatsyncen overskriver fortsatt blindt, og RecMan-sync-action er ikke admin-gatet. I tillegg har middleware-endringen en sannsynlig regresjon for passordbeskyttede offentlige skjema.

Tasks 7 og 8 boer ikke startes som produktimplementasjon foer disse integrasjonsgapene er lukket. AI-laget ville ellers bli bygget oppaa uferdig sync- og tilgangsflate.

## Scope evaluert

Kodebasen er vurdert mot 14 commits over `origin/main`:

- `d0be968 feat(foundation): databasemodeller og endringslogg-helpere`
- `c6bf63d fix(change-log): stott rollback via runId`
- `f046255 fix(change-log): atomisk recordChange og rollback i transaksjon`
- `731b1a5 perf(schema): legg til indeks for rullback og downstream-sporringer`
- `1002aae feat(access): tilgangsnivaa i database med MINIMUM-fallback`
- `5f6e54b fix(api): krev User-tilgang for lese-endepunkter`
- `a6aae2d refactor(access): single auth() per request og delt resolver`
- `37aecc3 fix(access): atomisk approve/deny og race-trygg requestAccess`
- `9efa963 feat(personell): unifiser kategorier rundt felles helper og overgang`
- `010c58a feat(personell): unifiser listevisninger via getPersonnelishList`
- `37df418 fix(personell): hard innleid-overgang, audit-symmetri og admin-gate`
- `1f0e510 feat(skjema): kategori- og avdelingsfilter paa lenker`
- `f9eaeb7 feat(varsler): in-app + e-post for tilgangsforesporsler`
- `ee16d0e feat(sync): konfliktoppdaging og ko-resultater per sync-runde`

I tillegg er dagens dirty worktree vurdert uten aa revert'e eksisterende endringer.

## Viktigste funn

### P1 - RecMan-sync kan trigges av alle innloggede brukere

`src/app/(authenticated)/recman/actions.ts:25-30` importerer `assertAdmin`, men `triggerRecmanSync()` kaller den ikke. Funksjonen sjekker bare at brukeren er autentisert foer den starter `syncAllRecman(session.user.id)`.

Dette bryter planens regel om at sync og farlige handlinger skal ligge hos Admin. Det boer fikses foer sync- eller AI-flater eksponeres videre.

### P1 - RecMan-kandidater overskrives fortsatt blindt

`src/lib/recman/sync.ts:84-129` kjorer gjennom alle kandidater og returnerer `emptySyncResult()`. Kommentaren sier eksplisitt at detector hoppes over fordi det ikke finnes base-snapshot.

`src/lib/recman/sync.ts:225-232` gjoer deretter `db.recmanCandidate.upsert({ update: candidateData })`, som skriver alle kandidatfelt direkte fra RecMan.

Dette bryter Task 6-regelen: "Daglig sync skal hente og sammenligne, ikke blindt overskrive" og review gate: "Ingen silent overwrite nar samme felt er endret begge steder."

### P1 - Passordbeskyttede offentlige skjema kan bli blokkert av middleware

`middleware.ts:36-39` matcher alle routes unntatt `api/auth`, `_next/*` og `favicon.ico`. `src/lib/auth.config.ts:10-21` markerer bare `/login` og `/s/*` som offentlige. Dermed blir `/api/form-auth/verify-password` behandlet som beskyttet selv om `src/components/skjema/form-auth-gate.tsx:25-29` kaller den fra en offentlig skjemaside.

Konsekvensen er at passordskjema kan faa redirect/401 i stedet for JSON-svar, og klienten vil trolig feile naar den gjoer `res.json()`.

### P2 - Varsler kan markeres lest uten mottakerscope

`src/app/(authenticated)/settings/actions.ts:273-280` tar en liste med notification-id-er og sender dem rett til `markAsRead`. `src/lib/notifications/list-notifications.ts:75-84` oppdaterer alle matchende ID-er uten aa avgrense til `targetUserId` eller `targetLevel`.

Dette er ikke datalekkasje alene, men en bruker som kjenner eller gjetter en ID kan kvittere ut et varsel de ikke eier. Helperen boer ta audience-query eller actionen boer filtrere ID-er mot gjeldende bruker/tilgangsnivaa.

### P2 - PowerOffice base-snapshot flyttes selv ved konflikt

`src/lib/poweroffice/sync-employees.ts:149-176` skriver alltid `rawJson` til siste remote payload, og kommentaren definerer `rawJson` som base for neste sync. Hvis ett felt er i konflikt, flyttes basen likevel til remote-verdi mens lokal verdi ikke oppdateres.

Det gjor at neste sync kan se samme uavklarte konflikt som `local_only`/pending push i stedet for fortsatt konflikt. `SyncConflict`-raden finnes, men diagnosemodellen mister noe av signalet. Dette boer avklares foer Task 6 kalles ferdig.

## Status per task

### Task 1 - Foundation Schema And Change Backbone

Vurdering: **i praksis ferdig som foundation**

Schemaet har `UserAccess`, `AccessRequest`, `SystemNotification`, `ChangeLog`, `ChangeLogEntry`, `SyncConflict` og `AiActionRun`. `recordChange` og `rollbackChange` har gode enhetstester, transaksjonsatferd og runId-stotte.

Rest: rollback er en motor, ikke en ferdig applikasjonsflate. Nye actions maa fortsatt kobles konsekvent til change-log og rollback-appliers.

### Task 2 - Access Control And Minimum Access

Vurdering: **langt paa vei ferdig**

DB-basert `MINIMUM | USER | ADMIN` finnes, session berikes, `(authenticated)`-layout sender `MINIMUM` til venteside, og tilgangsforesporsler behandles atomisk av admin.

Rest: noen actions/routes boer fortsatt sjekkes for korrekt `requireUser`/`assertAdmin`, med RecMan-sync som tydeligste avvik.

### Task 3 - Unified Personnel Domain

Vurdering: **betydelig framdrift, men ikke helt ferdig UI-messig**

Felles kategorihelper, kandidatdata-normalisering, presentasjonshelper og listevisninger har tester. Evalueringer bruker naa delt kategori-logikk for `Ansatt`/`Innleid`.

Rest: detaljprofilene og manuelle arbeidsflyter virker fortsatt ikke dokumentert som fullstendig enhetlige for alle tre kategorier. Dette boer manuelltestes etter at sync-gaps er lukket.

### Task 4 - Forms, Filters And Evaluation Cohesion

Vurdering: **nesten ferdig**

`EvaluationLink` har kategori- og avdelingsfilter, create-link UI skriver filterdata, public actions validerer personvalg mot filter, og evalueringsqueries bruker delt filterhelper.

Rest: offentlig passordflyt er sannsynligvis knekt av middleware-regresjonen. Det er ogsaa behov for en manuell ende-til-ende-test fra link-oppretting til innsending.

### Task 5 - Notifications And Access Requests

Vurdering: **langt paa vei ferdig**

Adminvarsler, brukerrettede varsler, access request-flyt og optional e-postspor finnes og har tester. Varsler brukes ogsaa som grunnlag for sync-resultater.

Rest: `markAsRead` trenger mottakerscope. SMTP-flyt er testet med mock, men ikke verifisert mot faktisk miljoe.

### Task 6 - Sync Queue, Conflict Detection And Recovery

Vurdering: **delvis ferdig, fortsatt blokkert av integrasjonsgap**

`src/lib/sync/conflict-detector.ts` og `src/lib/sync/sync-queue.ts` er gode byggesteiner, og testene dekker remote-only, local-only, missing-link og conflicts. PowerOffice-ansatte bruker modellen delvis.

Rest/blokkere:

- RecMan-kandidater bruker fortsatt blind upsert.
- RecMan-sync mangler admin-gate.
- Det finnes ikke bekreftet UI/action-flyt for aa lose `SyncConflict`.
- PowerOffice rawJson/base-semantikk ved konflikt maa avklares.

### Task 7 - AI Assistant Shell And Action Layer

Vurdering: **spec/forarbeid, ikke implementert**

Det finnes en untracked AI-spec: `docs/superpowers/specs/2026-04-29-task-7-ai-assistent-AI-SPEC.md`. Det ble ikke funnet faktisk `src/app/(authenticated)/assistant/page.tsx`, `src/components/assistant/*` eller `src/lib/assistant/run-assistant-action.ts`.

Konklusjon: Task 7 maa fortsatt regnes som ikke implementert.

### Task 8 - Course Documents And AI Extraction

Vurdering: **ikke startet som planlagt produktflate**

Personellprofilen viser eksisterende kursdata fra RecMan, og sync mapper certifications til intern course-form. Det er nyttig grunnlag, men ikke Task 8.

Det ble ikke funnet `personnel-documents-tab`, `document-parser` eller `course-records` som planen krever. Dokumentopplasting, AI-forslag og godkjenningsflyt mangler.

## Verifisering kjoert

Alle kommandoer ble kjoert 2026-04-29 i `C:\Users\EricMolnes\Dev\apps\nrt`.

```bash
pnpm exec tsx --test src/lib/tools-registry.test.ts src/lib/access/get-current-access.test.ts src/lib/change-log/record-change.test.ts src/lib/change-log/rollback-change.test.ts src/lib/forms/dynamic-fields.test.ts src/lib/forms/link-filters.test.ts src/lib/forms/personnel-access.test.ts src/lib/notifications/create-notification.test.ts src/lib/personell/candidate-data.test.ts src/lib/personell/category.test.ts src/lib/personell/personnel-list-presentation.test.ts src/lib/poweroffice/config.test.ts src/lib/queries/evaluation-personnel-filters.test.ts src/lib/queries/personnel-list.test.ts src/lib/recman/sync-jobs.test.ts src/lib/sync/conflict-detector.test.ts src/lib/sync/sync-queue.test.ts
```

Resultat: 153 tester, 153 pass.

```bash
pnpm build
```

Resultat: pass. Next.js bygget 49 routes.

```bash
pnpm lint
```

Resultat: 0 errors, 62 warnings. Varslene er hovedsakelig unused imports og React Compiler/react-hooks-varsler i eksisterende UI.

```bash
git diff --check
```

Resultat: exit 0. Kun CRLF-advarsler fra Git.

## Anbefalt neste rekkefolge

1. Fiks RecMan `triggerRecmanSync` med `assertAdmin()` og legg en liten test eller action-verifikasjon hvis mulig.
2. Fiks middleware/public API-unntak for `/api/form-auth/verify-password` uten aa aapne beskyttede API-er som `/api/form-auth/import-contractors`.
3. Scope `markNotificationsRead` til gjeldende mottaker.
4. Bestem og implementer base-snapshot for RecManCandidate, saa RecMan-kandidatsync kan bruke samme detector/queue som planen krever.
5. Avklar PowerOffice rawJson/base ved konflikt.
6. Lag UI/action for aa se og lose `SyncConflict`.
7. Fullfoer manuell E2E for Task 3/4/5.
8. Start Task 7 AI-assistent etter at Task 6 faktisk er trygg.
9. Start Task 8 etter Task 7 action-layer, siden dokument-AI trenger samme godkjennings- og loggingmodell.

## Samlet vurdering

Dette er ikke et mislykket spor. Tvert imot: grunnmuren er god, testdekningen paa de nye rene helperne er sterk, og mye av domenesammenhengen er paa plass. Men "ferdig"-etiketten maa holdes tilbake til de farlige grensene er lukket: sync-rettigheter, offentlig skjema-auth og silent overwrite i RecMan.
