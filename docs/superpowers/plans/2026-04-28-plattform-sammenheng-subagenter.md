# Plattform Sammenheng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gjore personell, kandidater, innleide, tilgangsstyring, sync, varsling, versjonslogg og AI-assistent til ett sammenhengende system uten at tilfeldige brukere far for mye tilgang eller at sync overskriver data ukontrollert.

**Architecture:** Dette er en masterplan for flere uavhengige delsystemer. Vi bygger en felles datarygg for tilgang, tilgangsforesporsler, varsler, konfliktregistrering og versjonslogg forst. Deretter samler vi personell-domenet rundt en lik profilmodell, kobler skjema og sync pa den modellen, og til slutt legger vi AI-assistenten oppa som en kontrollert handlingstjeneste som alltid bruker samme rettigheter som brukeren.

**Tech Stack:** Next.js 16 App Router, Prisma 7, NextAuth v5, Neon/Postgres, eksisterende RecMan- og PowerOffice-klienter, Node test runner via `pnpm exec tsx --test`

---

## Scope Split

Denne leveransen er for stor til at en enkelt implementeringsagent bor eie alt samtidig. Vi deler derfor arbeidet i seks hovedspor pluss en koordinerende agent. Hver agent far et avgrenset skrivesett. Ingen implementeringsagent far endre schema, UI og sync-logikk samtidig.

## Global Rules For All Subagents

- All endringer skal folge TDD i egen task.
- Ingen agent far skrive i en annen agents eksplisitte skrivesett uten ny godkjenning.
- AI-assistenten skal aldri kunne overskride brukerens tilgangsniva.
- `Minimum` er innlogget men praktisk talt null tilgang.
- Alle dataendringer gjort av AI eller bruker skal kunne spores og rulles tilbake.
- RecMan-konflikter skal ikke auto-loses dersom samme felt er endret begge steder.
- Kandidat som markeres som innleid skal flyttes ut av kandidatopplevelsen og behandles som innleid i UI.
- Ansattstatus skal komme fra RecMan, men kandidat/innleid skal kunne styres manuelt i NRT.

## Coordinator Agent

**Ansvar:** Holde hovedplanen oppdatert, dele ut tasks, passe pa skrivemal, kjore integrasjonsverifikasjon mellom hver wave.

**Primare filer:**
- Modify: `docs/superpowers/plans/2026-04-28-plattform-sammenheng-subagenter.md`
- Read heavily: `prisma/schema.prisma`
- Read heavily: `src/lib/rbac.ts`
- Read heavily: `src/lib/recman/sync.ts`
- Read heavily: `src/lib/poweroffice/sync.ts`
- Read heavily: `src/lib/queries/personnel.ts`

**Done nar:**
- Alle arbeidsspor har tydelige eiere og ingen overlappende write sets i samme wave.
- Integrasjonstester og sluttkontroll er planlagt.

---

### Task 1: Foundation Schema And Change Backbone

**Owner:** Subagent `foundation-schema`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/change-log/record-change.ts`
- Create: `src/lib/change-log/rollback-change.ts`
- Create: `src/lib/change-log/types.ts`
- Create: `src/lib/change-log/record-change.test.ts`
- Create: `src/lib/change-log/rollback-change.test.ts`

**Purpose:** Legg til databaseobjekter som resten av systemet trenger: tilgangsprofil, tilgangsforesporsel, varsel, versjonslogg, sync-konflikt og AI-handlingslogg.

**Expected schema additions:**
- `UserAccess` eller tilsvarende tabell knyttet til `entraId` eller `email`
- `AccessRequest`
- `SystemNotification`
- `ChangeLog`
- `ChangeLogEntry`
- `SyncConflict`
- `AiActionRun`

**Dependencies:** Ingen. Denne tasken ma fullfores forst.

**Tests:**
- `pnpm exec tsx --test src/lib/change-log/record-change.test.ts src/lib/change-log/rollback-change.test.ts`

**Implementation checklist:**
- [ ] Skriv failing tester for opptak av en enkel endring med gammel og ny verdi.
- [ ] Skriv failing tester for rollback av en enkel endring.
- [ ] Utvid Prisma-schema med nye modeller uten a bryte eksisterende relasjoner.
- [ ] Implementer minste felles endringslogg som kan brukes fra actions og sync.
- [ ] Implementer rollback for en enkel endring og en gruppe endringer via `runId`.
- [ ] Kjor Prisma generate og relevante tester.
- [ ] Commit med fokus pa foundation data model.

**Review gate:**
- Endringsloggen ma kunne logge `actorType` = `USER` eller `AI`.
- Rollback ma stotte minst enkel feltendring og gruppeendring.
- Ingen eksisterende modeller skal miste felt eller constraints.

---

### Task 2: Access Control And Minimum Access

**Owner:** Subagent `access-control`

**Files:**
- Modify: `src/lib/auth.config.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/rbac.ts`
- Modify: `src/types/next-auth.d.ts`
- Modify: `src/app/(authenticated)/layout.tsx`
- Modify: `src/app/(authenticated)/settings/page.tsx`
- Modify: `src/app/(authenticated)/settings/actions.ts`
- Create: `src/app/(authenticated)/waiting-access/page.tsx`
- Create: `src/components/settings/access-requests-panel.tsx`
- Create: `src/lib/access/get-current-access.ts`
- Create: `src/lib/access/get-current-access.test.ts`

**Purpose:** Bygg ekte tilgangsniva i databasen, ikke bare `.env`-admin. Nye brukere skal lande pa `Minimum`, opprette tilgangsforesporsel og stoppes fra resten av systemet til admin gir tilgang.

**Dependencies:** Task 1

**Rules to implement:**
- `Minimum` = kan logge inn, se venteside, logge ut, og ingenting mer.
- `User` = normal intern bruker.
- `Admin` = kan styre tilgang, sync, AI-moduser og farlige handlinger.
- Manglende tilgangsrad = behandles som `Minimum`.
- Eksisterende `ADMIN_EMAILS` og `ADMIN_GROUP_ID` kan brukes som bootstrap til `Admin`, men ikke som eneste modell pa sikt.

**Tests:**
- `pnpm exec tsx --test src/lib/access/get-current-access.test.ts`

**Implementation checklist:**
- [ ] Skriv failing tester for opplosning av tilgangsniva med fallback til `Minimum`.
- [ ] Implementer `getCurrentAccess` mot ny tilgangsmodell.
- [ ] Utvid session med tilgangsniva og eventuell tilgangsrad-id.
- [ ] Oppdater `rbac.ts` til a bruke database + bootstrap admin.
- [ ] Legg inn redirect til `waiting-access` for brukere med `Minimum`.
- [ ] Legg adminpanel i settings for behandling av tilgangsforesporsler.
- [ ] Logg tilgangsendringer via change-log fra Task 1.
- [ ] Kjor tester og manuell innloggingsflyt.
- [ ] Commit med fokus pa tilgangsmodell.

**Review gate:**
- Ingen anonym eller ny bruker skal kunne se personell, kunder, sync eller admin.
- AI-handlinger ma senere kunne lese samme tilgangsniva.

---

### Task 3: Unified Personnel Domain

**Owner:** Subagent `personnel-domain`

**Files:**
- Modify: `src/lib/queries/personnel.ts`
- Modify: `src/app/(authenticated)/personell/page.tsx`
- Modify: `src/app/(authenticated)/personell/kandidater/page.tsx`
- Modify: `src/app/(authenticated)/personell/innleide/page.tsx`
- Modify: `src/app/(authenticated)/personell/kandidater/actions.ts`
- Modify: `src/app/(authenticated)/personell/[id]/actions.ts`
- Modify: `src/components/personell/personnel-list.tsx`
- Modify: `src/components/personell/personnel-form.tsx`
- Modify: `src/components/personell/personnel-card-tabs.tsx`
- Modify: `src/components/kandidater/candidate-list-view.tsx`
- Modify: `src/components/innleide/contractor-list-view.tsx`
- Create: `src/lib/personell/category.ts`
- Create: `src/lib/personell/category.test.ts`

**Purpose:** Samle ansatte, kandidater og innleide rundt samme profiloppsett og samme felt, mens kategori bestemmer listeplassering og arbeidsflyt.

**Dependencies:** Task 1, Task 2

**Functional rules:**
- Alle tre kategorier skal bruke samme felt- og profilstruktur.
- `Ansatt` identifiseres fra RecMan employee-data.
- `Innleid` kan vare manuell eller RecMan-kandidat markert som innleid.
- `Kandidat` er RecMan-person som ikke er ansatt og ikke aktivt innleid.
- Kandidat -> innleid skal flytte personen ut av kandidatopplevelsen.

**Known bug to absorb:**
- `src/lib/queries/personnel.ts` overskriver `where.recmanCandidate` nar flere filter kombineres.

**Tests:**
- Create and run: `pnpm exec tsx --test src/lib/personell/category.test.ts`
- Extend existing relevant tests for candidate/personnel mapping

**Implementation checklist:**
- [ ] Skriv failing tester for kategoriberegning: `Ansatt`, `Innleid`, `Kandidat`.
- [ ] Implementer felles kategorihjelper som kan brukes i queries og UI.
- [ ] Refaktorer `getPersonnelList` sa kombinerte filter ikke overskriver hverandre.
- [ ] Oppdater listevisninger slik at de henter samme profilgrunnlag men med ulik kategori-filtering.
- [ ] Bytt gammel `toggleContractor`-flyt til en kategori-bevisst overgang med historikk.
- [ ] Sikre at profilfaner, felt og evalueringer er like for alle tre kategorier.
- [ ] Logg kategoriendringer via change-log.
- [ ] Kjor tester og manuell gjennomgang av tre lister.
- [ ] Commit med fokus pa personelldomene.

**Review gate:**
- Ingen egen "annenrangs" profil for kandidater eller innleide.
- Ingen duplisering av persondata mellom UI-variantene utover nodvendig presentasjon.

---

### Task 4: Forms, Filters And Evaluation Cohesion

**Owner:** Subagent `forms-and-evaluations`

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/(authenticated)/skjema/actions.ts`
- Modify: `src/app/(public)/s/[token]/actions.ts`
- Modify: `src/components/skjema/create-link-form.tsx`
- Modify: `src/components/skjema/public-evaluation-form.tsx`
- Modify: `src/components/skjema/public-custom-fields-form.tsx`
- Modify: `src/lib/forms/personnel-access.ts`
- Modify: `src/lib/forms/personnel-access.test.ts`
- Modify: `src/lib/queries/evaluations.ts`
- Create: `src/lib/forms/link-filters.ts`
- Create: `src/lib/forms/link-filters.test.ts`

**Purpose:** Gjor skjema-lenker kategori- og avdelingsstyrte, sa mottaker kan velge relevant person men ikke hele registeret.

**Dependencies:** Task 3

**Functional rules:**
- Skjema skal kunne brukes pa ansatte, innleide og kandidater.
- Lenker skal lagre filter for kategori og avdeling.
- Mottaker velger person fra filtrert liste.
- Rollefilter alene er ikke nok lenger; avdeling ma vare en ekte del av lenken.

**Tests:**
- `pnpm exec tsx --test src/lib/forms/personnel-access.test.ts src/lib/forms/link-filters.test.ts`

**Implementation checklist:**
- [ ] Skriv failing tester for lenker med avdelingsfilter + kategorifilter.
- [ ] Utvid schema hvis `EvaluationLink` trenger avdelingsfelt eller filter-JSON.
- [ ] Implementer felles filtertolking i `src/lib/forms/link-filters.ts`.
- [ ] Oppdater oppretting av lenker til a lagre ekte filterdata.
- [ ] Oppdater public actions til a validere mot kategori + avdeling.
- [ ] Oppdater create-link UI slik at bruker ser hva lenken faktisk begrenser.
- [ ] Bekreft at samme personalprofil kan evalueres uansett kategori.
- [ ] Kjor tester og en manuell flyt fra opprett link til innsending.
- [ ] Commit med fokus pa skjema og evaluering.

**Review gate:**
- Filter som vises i UI ma vare de samme som faktisk handheves i actions.
- Ingen offentlig innsending skal kunne velge en person utenfor filteret.

---

### Task 5: Notifications And Access Requests

**Owner:** Subagent `notifications`

**Files:**
- Modify: `src/app/(authenticated)/settings/page.tsx`
- Modify: `src/app/(authenticated)/settings/actions.ts`
- Create: `src/lib/notifications/create-notification.ts`
- Create: `src/lib/notifications/list-notifications.ts`
- Create: `src/lib/notifications/send-access-request-email.ts`
- Create: `src/lib/notifications/create-notification.test.ts`
- Create: `src/components/layout/notification-bell.tsx`
- Modify: `src/components/layout/app-header.tsx`

**Purpose:** Varsle admin i systemet og pa e-post nar nye brukere lander pa `Minimum`, og bruk samme varslingsspor senere for sync-konflikter og AI-forslag.

**Dependencies:** Task 1, Task 2

**Tests:**
- `pnpm exec tsx --test src/lib/notifications/create-notification.test.ts`

**Implementation checklist:**
- [ ] Skriv failing tester for oppretting av internnotifikasjon ved ny tilgangsforesporsel.
- [ ] Implementer notification helpers.
- [ ] Implementer e-postsender for admin-varsel med trygg fallback hvis mail-oppsett mangler.
- [ ] Koble dette inn i forstegangsinnlogging / tilgangsforesporsel.
- [ ] Legg enkel notifikasjonsindikator i header.
- [ ] Vis pending requests i settings/admin.
- [ ] Kjor tester og verifiser at systemet fortsatt fungerer uten e-postoppsett.
- [ ] Commit med fokus pa varsling.

**Review gate:**
- Ny bruker skal gi admin synlig varsel i app.
- E-postfeil ma ikke knuse innloggingen.

---

### Task 6: Sync Queue, Conflict Detection And Recovery

**Owner:** Subagent `sync-conflicts`

**Files:**
- Modify: `src/lib/recman/sync.ts`
- Modify: `src/lib/poweroffice/sync.ts`
- Modify: `src/lib/poweroffice/sync-employees.ts`
- Modify: `src/app/(authenticated)/recman/actions.ts`
- Modify: `src/app/(authenticated)/poweroffice/actions.ts`
- Modify: `src/components/recman/sync-button.tsx`
- Modify: `src/components/poweroffice/sync-button.tsx`
- Create: `src/lib/sync/conflict-detector.ts`
- Create: `src/lib/sync/conflict-detector.test.ts`
- Create: `src/lib/sync/sync-queue.ts`
- Create: `src/lib/sync/sync-queue.test.ts`

**Purpose:** Bygg en sync-modell som skiller mellom trygge pull-endringer, lokale usendte endringer, konflikter og elementer som ma kobles eller opprettes i RecMan.

**Dependencies:** Task 1, Task 3, Task 5

**Functional rules:**
- Daglig sync skal hente og sammenligne, ikke blindt overskrive.
- Lokale endringer kan ligge som `pending push`.
- Felt endret begge steder skal bli `conflict`.
- Sync-resultat skal kunne grupperes til samlet losning.

**Tests:**
- `pnpm exec tsx --test src/lib/sync/conflict-detector.test.ts src/lib/sync/sync-queue.test.ts src/lib/recman/sync-jobs.test.ts`

**Implementation checklist:**
- [ ] Skriv failing tester for feltkonflikt mellom lokal verdi og RecMan-verdi.
- [ ] Skriv failing tester for "kun lokal endring", "kun remote endring" og "mangler kobling".
- [ ] Implementer konfliktmotor og sync-queue.
- [ ] Utvid eksisterende sync-logikk til a registrere konflikter og pending push.
- [ ] Oppdater sync-knapper/actions til a returnere grupperbar resultatpakke.
- [ ] Opprett notifikasjon nar sync krever oppmerksomhet.
- [ ] Kjor tester og manuell sync mot testdata/mock.
- [ ] Commit med fokus pa sync-kontroll.

**Review gate:**
- Ingen silent overwrite nar samme felt er endret begge steder.
- Logikk ma fungere pa personniva, ikke bare pa sync-jobbniva.

---

### Task 7: AI Assistant Shell And Action Layer

**Owner:** Subagent `ai-assistant`

**Files:**
- Modify: `src/app/(authenticated)/settings/page.tsx`
- Modify: `src/components/settings/ai-model-setting.tsx`
- Create: `src/app/(authenticated)/assistant/page.tsx`
- Create: `src/components/assistant/assistant-panel.tsx`
- Create: `src/components/assistant/assistant-mode-switcher.tsx`
- Create: `src/components/assistant/sync-review-panel.tsx`
- Create: `src/lib/assistant/resolve-user-capabilities.ts`
- Create: `src/lib/assistant/run-assistant-action.ts`
- Create: `src/lib/assistant/run-assistant-action.test.ts`
- Create: `src/lib/assistant/prompts.ts`

**Purpose:** Lage fast AI-chat i systemet og et sync-review-panel som kan foresla grupperte endringer, forklare dem kort og be om bekreftelse i Claude-lignende flyt.

**Dependencies:** Task 2, Task 5, Task 6

**Functional rules:**
- Moduser: `Plan`, `Ask before edits`, `Auto` og senere `Admin/Bypass`.
- Forste versjon skal fortsatt kreve bekreftelse for farlige endringer.
- AI skal kunne endre alt som ikke er kode, men bare innenfor brukerens tilgang.
- Sync med konflikter skal kunne apne assistantpanel automatisk.

**Tests:**
- `pnpm exec tsx --test src/lib/assistant/run-assistant-action.test.ts`

**Implementation checklist:**
- [ ] Skriv failing tester for capability-resolusjon fra brukerrolle.
- [ ] Skriv failing tester for at AI ikke kan utfore handlinger uten tilgang.
- [ ] Implementer action-layer som bare kaller godkjente serverfunksjoner.
- [ ] Implementer mode switcher og assistant panel.
- [ ] Implementer sync review panel som viser korte grupper med mulighet til a bore dypere.
- [ ] Logg AI-run og alle genererte endringer mot change-log.
- [ ] Kjor tester og manuell trygghetsgjennomgang.
- [ ] Commit med fokus pa assistant shell.

**Review gate:**
- AI skal aldri fa direkte database-skrivetilgang utenom godkjente actions.
- AI-run ma kunne knyttes til versjonslogg og rollback.

---

### Task 8: Course Documents And AI Extraction

**Owner:** Subagent `documents-and-courses`

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/components/personell/personnel-competence-tab.tsx`
- Modify: `src/components/personell/personnel-fields-tab.tsx`
- Modify: `src/app/(authenticated)/personell/[id]/actions.ts`
- Create: `src/components/personell/personnel-documents-tab.tsx`
- Create: `src/lib/personell/document-parser.ts`
- Create: `src/lib/personell/document-parser.test.ts`
- Create: `src/lib/personell/course-records.ts`
- Create: `src/lib/personell/course-records.test.ts`

**Purpose:** Gi alle profiler en fast plass for dokumentasjon og bygg en AI-assistert flyt som leser kursbevis og foreslar kursnavn, dato og gyldighet.

**Dependencies:** Task 1, Task 3, Task 7

**Functional rules:**
- Alle kategorier skal kunne laste opp dokumentasjon.
- Forste versjon skal lagre filer/metadataspor og AI-forslag.
- AI-tolkning skal lage forslag som kan godkjennes, ikke skrive rett inn blindt.

**Tests:**
- `pnpm exec tsx --test src/lib/personell/document-parser.test.ts src/lib/personell/course-records.test.ts`

**Implementation checklist:**
- [ ] Skriv failing tester for normalisert kursforslag fra dokumentparser.
- [ ] Bestem om eksisterende dokumentmodell kan gjenbrukes eller om personell trenger egen dokumentkobling.
- [ ] Implementer dokumentlagring for personellprofil.
- [ ] Implementer AI-parser som returnerer forslag, ikke endelig vedtak.
- [ ] Legg inn godkjenningsflyt i profil-UI.
- [ ] Logg godkjent eller avvist AI-forslag.
- [ ] Kjor tester og manuell opplasting med flere filer.
- [ ] Commit med fokus pa kursdokumenter.

**Review gate:**
- Dokumenter ma kunne lagres uten AI.
- AI-uttrekk ma kunne avvises eller korrigeres.

---

## Parallel Execution Waves

### Wave 0: Coordination
- Coordinator lager egen taskliste, bekrefter write sets og etablerer integrasjonsrekkefolge.

### Wave 1: Foundation First
- Task 1 `foundation-schema`
- Task 2 `access-control`

Disse to bor ikke kodes parallelt hvis Task 2 trenger schema fra Task 1 samme dag. La Task 1 lande forst.

### Wave 2: Safe Parallelism
- Task 3 `personnel-domain`
- Task 5 `notifications`

Disse kan kodes parallelt nar foundation er landet. Skrivemalene overlapper lite.

### Wave 3: Domain Cohesion
- Task 4 `forms-and-evaluations`
- Task 6 `sync-conflicts`

Disse kan delvis ga parallelt, men `sync-conflicts` bor lese siste kategori- og tilgangsregler fra Task 3.

### Wave 4: AI Surface
- Task 7 `ai-assistant`
- Task 8 `documents-and-courses`

Disse kan starte nar tilgang, varsler og endringslogg er pa plass.

### Wave 5: Final Integration
- Coordinator kjorer full verifikasjon
- Gjenbruk `superpowers:requesting-code-review`
- Avslutt med `superpowers:verification-before-completion`

## Subagent Prompt Skeleton

Bruk denne formen for hver implementeringsagent:

```text
Du eier kun Task X fra docs/superpowers/plans/2026-04-28-plattform-sammenheng-subagenter.md.

Skrivemal:
- [liste med filer]

Du er ikke alene i codebasen. Ikke revert andres endringer. Tilpass deg eksisterende endringer hvis de ikke blokkerer tasken.

Krav:
- Folg TDD
- Kjor kun relevante tester
- Oppsummer endringer, tester og eventuelle bekymringer
- List alle filer du endret
```

## Merge And Verification Checklist

- Kjor relevante deltester per task.
- Kjor samlet testpakke for nye helper-moduler.
- Kjor `pnpm build`.
- Kjor `pnpm lint`.
- Manuell sjekk:
  - ny bruker far `Minimum`
  - admin mottar varsel
  - kandidat -> innleid flytter person til riktig liste
  - skjema respekterer kategori + avdeling
  - sync lager konflikt i stedet for overwrite
  - AI-assistent kan forklare og foresla, men ikke overskride tilgang
  - rollback fungerer pa minst en AI-kjort endringsgruppe

## Recommended First Child Plan

Start med `Task 1: Foundation Schema And Change Backbone`. Resten av planen blir betydelig enklere og tryggere nar dataryggen for tilgang, varsling, konflikt og versjonslogg finnes.
