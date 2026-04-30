# Handover - status mot plattform-sammenheng-planen

Dato: 2026-04-29
Arbeidskatalog: `C:\Users\EricMolnes\Dev\apps\nrt`
Planreferanse: `docs/superpowers/plans/2026-04-28-plattform-sammenheng-subagenter.md`

## Hensikt

Denne handoveren oppsummerer hva som faktisk finnes i workspace akkurat naa, maalt opp mot masterplanen. Dette er en kodeanalyse, ikke en full ende-til-ende-verifisering i UI.

Den gamle handoveren `2026-04-28-handover-tasks-7-8.md` beskriver Tasks 1-6 som ferdige. Denne filen bekrefter hva som er synlig i dagens repo, peker paa hva som stemmer, og kaller ut det som fortsatt ikke henger helt sammen.

## Kort status

- Task 1: i praksis langt paa vei ferdig paa schema- og foundation-nivaa
- Task 2: langt paa vei ferdig
- Task 3: delvis ferdig
- Task 4: betydelig framdrift, men ikke helt ryddet ferdig
- Task 5: langt paa vei ferdig
- Task 6: bare delvis synlig ferdig
- Task 7: ikke startet ordentlig
- Task 8: ikke startet ordentlig

Det viktigste bildet er dette:

1. Grunnmuren for tilgang, varsler, endringslogg og konfliktmodeller finnes allerede.
2. Kategori- og skjema-logikken har kommet mye lenger enn planen alene tilsier.
3. Det stoerste gjenstaaende arbeidet er aa fullfoere den faktiske sammenhengen i personell-UI, sync-flyt og AI-laget.

## Status per task

### Task 1 - Foundation Schema And Change Backbone

Vurdering: **nesten ferdig**

Synlig i `prisma/schema.prisma`:

- `UserAccess`
- `AccessRequest`
- `SystemNotification`
- `ChangeLog`
- `ChangeLogEntry`
- `SyncConflict`
- `AiActionRun`

Det finnes ogsaa tilhoerende enums for tilgang, notifikasjoner, actor/source og sync-konfliktstatus.

Konklusjon:
- Schema-grunnmuren planen etterspoer er allerede paa plass.
- Neste arbeid her er ikke schema-design, men aa sikre at alle nye flyter faktisk bruker foundation-laget konsekvent.

### Task 2 - Access Control And Minimum Access

Vurdering: **langt paa vei ferdig**

Viktigste filer:

- `src/lib/auth.ts`
- `src/lib/auth.config.ts`
- `src/lib/access/get-current-access.ts`
- `src/lib/access/get-current-access.test.ts`
- `src/app/(authenticated)/layout.tsx`
- `src/app/waiting-access/page.tsx`
- `src/types/next-auth.d.ts`

Det som allerede finnes:

- session blir beriket med `accessLevel` og `userAccessId`
- `MINIMUM | USER | ADMIN` er implementert som faktisk modell
- manglende tilgangsrad faller tilbake til `MINIMUM`
- `(authenticated)`-layout sender `MINIMUM`-brukere til `/waiting-access`
- ventesiden oppretter tilgangsforespoersel automatisk

Konklusjon:
- selve minimumstilgang-flyten er bygget
- modellen er i praksis databaseforankret allerede

Restpunkt:
- `src/app/(authenticated)/settings/page.tsx` viser fortsatt rolle i UI via `isAdmin()`-tenkning, ikke fullt ut via den nye access-modellen

### Task 3 - Unified Personnel Domain

Vurdering: **delvis ferdig**

Viktigste filer:

- `src/lib/personell/category.ts`
- `src/lib/personell/category.test.ts`
- `src/lib/queries/personnel.ts`
- `src/app/(authenticated)/personell/kandidater/page.tsx`
- `src/app/(authenticated)/personell/innleide/page.tsx`

Det som allerede finnes:

- felles kategorihelper med `ANSATT | INNLEID | KANDIDAT`
- kategori bestemmes ut fra RecMan-data, contractor-perioder og manuell personellrad
- query-laget bruker kategorilogikken
- kandidat- og innleid-listene bruker denne modellen

Det som fortsatt ser uferdig ut:

- full profil-unifisering for alle tre kategorier er ikke dokumentert som ferdig i dagens kodegjennomgang
- det ser fortsatt ut til aa finnes separate liste-/detaljopplevelser som ikke er helt samlet

Konklusjon:
- domenelogikken er paa god vei
- UI-opplevelsen virker fortsatt bare delvis harmonisert

### Task 4 - Forms, Filters And Evaluation Cohesion

Vurdering: **betydelig framdrift**

Viktigste filer:

- `src/lib/forms/link-filters.ts`
- `src/lib/forms/link-filters.test.ts`
- `src/lib/forms/personnel-access.ts`
- `src/lib/forms/dynamic-fields.ts`
- `src/app/(authenticated)/skjema/actions.ts`
- `src/app/(public)/s/[token]/actions.ts`
- `src/components/skjema/create-link-form.tsx`
- `src/lib/queries/evaluations.ts`

Det som allerede finnes:

- `EvaluationLink` har strukturerte filterfelt for kategori og avdeling
- public-form validerer personvalg mot disse filtrene
- create-link UI har kategori- og avdelingsvalg
- server-side filtertolking er samlet i egne helpers

Det som fortsatt skurrer:

- `src/lib/queries/evaluations.ts` har fortsatt gammel `roleFilterWhere(...)` side om side med ny kategorilogikk
- `src/components/skjema/create-link-form.tsx` ser ut til aa ha egen lokal kategoritenkning i stedet for aa lene seg fullt paa en delt resolver

Konklusjon:
- funksjonaliteten er i stor grad der
- men migreringen til ett felles kategorispor er ikke helt ryddet ferdig

### Task 5 - Notifications And Access Requests

Vurdering: **langt paa vei ferdig**

Viktigste filer:

- `src/app/(authenticated)/settings/actions.ts`
- `src/app/(authenticated)/settings/page.tsx`
- `src/components/layout/notification-bell.tsx`
- `src/lib/notifications/create-notification.ts`
- `src/lib/notifications/list-notifications.ts`
- `src/lib/notifications/send-access-request-email.ts`

Det som allerede finnes:

- admin kan behandle tilgangsforespoersler
- endringer logges
- brukerrettede varsler opprettes
- notifications vises i bell/dropdown og i settings
- e-postspor er lagt opp som trygg optional integrasjon

Konklusjon:
- denne delen ser funksjonelt moden ut

### Task 6 - Sync Queue, Conflict Detection And Recovery

Vurdering: **delvis ferdig / fortsatt uklar**

Synlig grunnlag:

- schema har `SyncConflict`
- tidligere handover beskriver `src/lib/sync/` som etablert
- dagens dirty worktree viser videre sync-relaterte endringer i:
  - `src/lib/recman/sync-jobs.ts`
  - `src/lib/poweroffice/config.ts`
  - `src/lib/poweroffice/sync-customers.ts`
  - `src/lib/poweroffice/sync-invoices.ts`
  - `src/lib/poweroffice/sync-projects.ts`

Det som er tydelig:

- det er gjort nyttig sync-cohesion-arbeid
- det er ikke bekreftet i denne gjennomgangen at hele konfliktflyten i UI og actions er ferdig knyttet sammen

Konklusjon:
- foundation og deler av motoren kan vaere paa plass
- men dette boer behandles som et aktivt integrasjonsomraade, ikke som "helt ferdig"

### Task 7 - AI Assistant Shell And Action Layer

Vurdering: **ikke startet ordentlig**

Det finnes foundation i form av `AiActionRun`, men det ble ikke funnet noe ferdig assistentlag i denne gjennomgangen som matcher planen:

- ingen bekreftet `assistant/page.tsx`
- ingen bekreftet `assistant-panel`
- ingen bekreftet action-layer for AI som respekterer brukerens tilgang

Konklusjon:
- her finnes mest sannsynlig bare grunnmur, ikke ferdig produktflate

### Task 8 - Course Documents And AI Extraction

Vurdering: **ikke startet ordentlig**

Det finnes noe naerliggende grunnarbeid:

- `src/lib/forms/dynamic-fields.ts`
- `src/lib/personell/candidate-data.ts`

Men det ble ikke funnet tegn til ferdig flyt for:

- dokumenttab paa personellprofil
- AI-lesing av kursbevis
- forslag/godkjenning av kursmetadata

Konklusjon:
- dette boer fortsatt regnes som aapent arbeid

## Viktige observasjoner og restpunkter

### 1. Planen er mer riktig enn "ferdig"-etikettene

Workspace ser ut til aa inneholde store deler av Tasks 1-5 allerede, men ikke alt henger helt sammen ennnaa. Neste agent boer derfor tenke:

- mindre "bygg grunnmuren fra null"
- mer "fullfoer koblingene, rydd opp i legacy-logikk, og verifiser flytene"

### 2. Gammel og ny filtermodell lever side om side

Saerlig i `src/lib/queries/evaluations.ts` ligger legacy `roleFilter`-logikk igjen sammen med ny kategori/avdelingstenkning. Det gir risiko for drift mellom:

- hva UI viser
- hva public form faktisk tillater
- hva admin tror lenkene filtrerer paa

### 3. Tilgangsmodellen er implementert, men ikke fullt gjennomfort i all presentasjon

`MINIMUM`-flyten finnes, men settings-siden presenterer fortsatt tilgang mer binart enn modellen egentlig tilsier.

### 4. Mojibake / encoding-problemer finnes i flere filer

Ved lesing i terminal sees tekst som:

- `pÃ¥`
- `fÃ¸r`
- `Ã¥pen`

Det maa avklares om dette bare er terminalvisning eller faktisk filinnhold. Hvis dette lekker til UI, boer det ryddes.

## Dagens dirty worktree

`git status --short` viste disse endringene:

Modifiserte filer:

- `middleware.ts`
- `src/app/(authenticated)/kunder/[id]/actions.ts`
- `src/app/(authenticated)/prosjekter/[id]/actions.ts`
- `src/components/layout/app-sidebar.tsx`
- `src/lib/poweroffice/config.ts`
- `src/lib/poweroffice/sync-customers.ts`
- `src/lib/poweroffice/sync-invoices.ts`
- `src/lib/poweroffice/sync-projects.ts`
- `src/lib/recman/sync-jobs.ts`
- `src/lib/tools-registry.ts`
- `tsconfig.json`

Untracked:

- `AGENTS.md`
- `docs/superpowers/plans/`
- `eslint.config.mjs`
- `src/lib/personell/candidate-data.test.ts`
- `src/lib/personell/candidate-data.ts`
- `src/lib/poweroffice/config.test.ts`
- `src/lib/recman/sync-jobs.test.ts`
- `src/lib/tools-registry.test.ts`

Merk:
- ikke revert denne worktreeen blindt
- flere av disse filene er relevante sideforbedringer, men ikke kjerneleveransen i planen

## Anbefalt neste rekkefolge

1. Fullfoer og verifiser **Task 3**
   - samme profilstruktur for ansatte, innleide og kandidater
   - fjern rester av egenbehandling der det ikke trengs

2. Rydd ferdig **Task 4**
   - fjern legacy `roleFilter`-logikk der ny kategorilogikk skal vaere fasit
   - saml kategoriavledning ett sted

3. Verifiser og sluttfoer **Task 6**
   - bekreft faktisk konfliktflyt i sync
   - bekreft notifikasjon og grouped-resultater
   - se om UI/action-laget virkelig bruker dette

4. Start **Task 7** foerst naar 3, 4 og 6 henger sammen
   - AI-panelet blir bedre og tryggere hvis domenemodellen allerede er ren

5. Ta **Task 8** etterpaa
   - dokumenter og AI-uttrekk boer bygge paa ferdig AI action-layer

## Anbefalt startpunkt for neste agent

Hvis neste agent bare skal begynne ett sted, boer den starte her:

- `src/components/personell/*`
- `src/app/(authenticated)/personell/*`
- `src/lib/queries/personnel.ts`
- `src/lib/queries/evaluations.ts`
- `src/components/skjema/create-link-form.tsx`

Maal:
- faa personellopplevelsen og skjema-logikken helt over paa samme kategori- og tilgangsmodell

## Verifisering som fortsatt mangler

Denne analysen sier mye om kodeform og arkitektur, men ikke alt om faktisk brukerflyt. Foer man erklaerer Task 3, 4 eller 6 som ferdige, boer neste agent eksplisitt verifisere:

- kandidat -> innleid flytter personen riktig i UI
- alle tre kategorier viser samme profilfelt
- offentlig skjema respekterer kategori + avdeling uten avvik
- sync lager konflikt i stedet for silent overwrite
- notifikasjoner og tilgangsforespoersler fortsatt fungerer etter videre opprydding
