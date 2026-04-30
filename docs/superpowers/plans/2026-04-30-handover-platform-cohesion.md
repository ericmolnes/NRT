# Handover 2026-04-30: Platform Cohesion

Arbeidsmappe: `C:\Users\EricMolnes\Dev\apps\nrt`

Branch: `codex/task3-task4-cohesion`

Siste commit:

```text
70ef41b65fac46855e79c82261c2dcbb2cf05870
feat(platform): complete cohesion workflows
```

## Kort Status

Platform cohesion-arbeidet er commitet og lokalt verifisert. Planen i
`docs/superpowers/plans/2026-04-29-videre-arbeid-plattform-sammenheng.md`
har fortsatt noen ukryssede opprinnelige task-checkboxer, men execution-status
nederst i filen er den autoritative statusen for siste run: funksjonene er
implementert, E2E-sjekket og commitet.

Arbeidskopien er ren for tracked endringer etter commit. `git status
--short --ignored=matching` viser bare ignorerte lokale filer som `.env.local`,
`.next/`, `node_modules/`, `src/generated/prisma/`, `tsconfig.tsbuildinfo` og
`scratch-dev-assistant*.log`.

Dev-serveren lyttet fortsatt paa `http://localhost:3000` med process `29008`
ved handover-tidspunktet. In-app browser stod paa
`http://localhost:3000/personell/kandidater`.

## Hva Som Er I Drift Lokalt

- Personellkategori-filter for `ANSATT`, `INNLEID` og `KANDIDAT`.
- Kandidat kan markeres som innleid og flyttes fra kandidatflyt til
  innleidflyt.
- Evalueringslinker kan opprettes med kategori- og avdelingsfilter.
- Public form filtrerer personellvalg og blokkerer server-side innsending for
  personell utenfor filter.
- Access request for `MINIMUM`-bruker oppretter pending request og admin-varsel.
- SMTP-fravaer er fail-open: request og in-app-varsel opprettes selv om
  e-post ikke sendes.
- Sync conflict-liste, resolve/ignore-actions og settings-panel er lagt inn.
- PowerOffice employee rawJson/base-semantikk er oppdatert slik at base ikke
  avansere for konfliktfelt.
- AI assistant action layer har capability/RBAC-sjekk og logging av
  `AiActionRun`.
- `/assistant` er lagt inn i authenticated layout med Plan, Ask before edits og
  deaktivert Auto-modus.
- Kursdokumenter/personell-dokumentasjon og AI-forslagsflyt er lagt inn med
  tester og auditspor.
- Prisma-migrasjoner er ryddet for eksisterende Neon-database og har
  regresjonstest.

## Viktige Filer Og Omraader

- Plan og status:
  - `docs/superpowers/plans/2026-04-29-videre-arbeid-plattform-sammenheng.md`
  - `docs/superpowers/plans/2026-04-29-manual-e2e-checklist.md`
- Prisma/migrasjoner:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260429100000_baseline_platform_schema/migration.sql`
  - `prisma/migrations/20260429110000_add_foundation_tables/migration.sql`
  - `prisma/migrations/20260429113000_add_recman_candidate_raw_json/migration.sql`
  - `prisma/migrations/20260429143000_add_personnel_documents_courses/migration.sql`
  - `src/lib/db/prisma-migrations.test.ts`
- Sync-konflikter:
  - `src/lib/sync/list-conflicts.ts`
  - `src/app/(authenticated)/settings/sync-conflicts/actions.ts`
  - `src/components/settings/sync-conflicts-panel.tsx`
- AI-assistent:
  - `src/app/(authenticated)/assistant/page.tsx`
  - `src/components/assistant/*`
  - `src/lib/assistant/*`
- Personell/skjema/tilgang:
  - `src/lib/forms/personnel-access.ts`
  - `src/components/skjema/create-link-form.tsx`
  - `src/lib/queries/evaluation-personnel-filters.ts`
  - `src/lib/notifications/*`
- Kursdokumenter:
  - `src/components/personell/personnel-documents-tab.tsx`
  - `src/lib/personell/course-records.ts`
  - `src/lib/personell/document-parser.ts`

## Database Og Migrasjoner

Prisma-status ved siste verifisering:

```text
pnpm exec prisma migrate status --config prisma.config.ts
Database schema is up to date.
```

Det ble gjort en baseline-reparasjon mot eksisterende Neon-database:

- `20260312160126_init` ble markert som applied.
- `20260429100000_baseline_platform_schema` ble markert som applied.
- Disse migrasjonene ble deployet:
  - `20260429110000_add_foundation_tables`
  - `20260429113000_add_recman_candidate_raw_json`
  - `20260429143000_add_personnel_documents_courses`

Viktig: baseline-migrasjonen er ikke en "fresh empty DB"-init. Den er laget for
aa representere eksisterende schemahistorikk frem til pre-foundation state.
Regresjonstesten i `src/lib/db/prisma-migrations.test.ts` passer paa at
baseline, foundation og senere task-migrasjoner ikke blandes feil igjen.

## Verifisering Som Er Kjoert

Siste fulle verifisering foer commit:

```powershell
pnpm exec tsx --test "src/**/*.test.ts"
pnpm build
pnpm lint
git diff --check
pnpm exec prisma migrate status --config prisma.config.ts
```

Resultat:

- Node test runner: `200` tester passet, `0` feilet.
- `pnpm build`: OK.
- `pnpm lint`: exit `0`, med `61` eksisterende warnings.
- `git diff --check`: exit `0`, kun CRLF-normaliseringswarnings.
- Prisma migrate status: schema up to date.

Staged check rett foer commit:

```powershell
git diff --cached --check
```

Resultat: exit `0`.

## Browser/E2E Bevis

E2E-run er dokumentert i:

```text
docs/superpowers/plans/2026-04-29-manual-e2e-checklist.md
```

RUN_ID:

```text
20260429-codex-153106
```

PASS:

- Personellfilter: `ANSATT`, `INNLEID`, `KANDIDAT`.
- Kandidat til innleid via UI confirm.
- Skjemalink med `INNLEID` + `E2E Drift 20260429-codex-153106`.
- Public form:
  - UI viser bare gyldig innleid personell.
  - Manipulert innsending med ansatt-ID utenfor filter ble server-side blokkert.
  - Gyldig innsending ble lagret og `usageCount` gikk fra `0` til `1`.
- Access request:
  - MINIMUM testbruker fikk `/waiting-access`.
  - Pending `AccessRequest` og ulest admin `SystemNotification` ble opprettet.
- SMTP-fravaer:
  - Alle paakrevde SMTP-vars manglet.
  - Appen opprettet fortsatt request og in-app admin notification.
- `/dashboard` og `/assistant` smoke.
- `/assistant` desktop/mobil uten horisontal overflow.

## Kjente Restpunkter

Dette er ikke blokkerende for committen, men er nyttig aa vite foer neste runde:

- Kodebasen har fortsatt `61` lint-warnings. De var eksisterende/ikke-blokkerende
  i siste run.
- Originale checkboxer i hovedplanen er ikke alle endret til `[x]`, selv om
  execution-statusen sier at arbeidet er verifisert. Ikke bruk bare checkboxene
  alene for status.
- Ingen push eller PR er gjort etter commit `70ef41b`.
- Lokale ignored runtimefiler finnes fortsatt:
  - `scratch-dev-assistant.log`
  - `scratch-dev-assistant.err.log`
  - `.next/`
  - `src/generated/prisma/`
- Dev-serveren kan fortsatt kjore paa port `3000`. Sjekk og stopp/start ved
  behov foer ny E2E.

## Anbefalt Neste Steg

1. Kjor en rask oppfrisket status:

   ```powershell
   git status --short
   pnpm exec prisma migrate status --config prisma.config.ts
   ```

2. Hvis maalet er aa dele arbeidet:

   ```powershell
   git push -u origin codex/task3-task4-cohesion
   ```

   Opprett deretter PR fra `codex/task3-task4-cohesion`.

3. Hvis maalet er mer produktarbeid foer PR, start med ett av disse:

   - Rydde lint-warnings som er lette og trygge.
   - Kjore en ny manuell smoke i appen etter restart av dev-server.
   - Gaa videre paa UI-polish for `/assistant` og sync-conflict review.
   - Legge inn mer robuste E2E-/Playwright-scripts for de manuelle flytene.

4. Hvis database/migrasjoner skal roeres igjen, start med
   `src/lib/db/prisma-migrations.test.ts` og migrasjonsstatus. Den testen er
   vakten mot aa gjenta baseline/foundation-feilen.

## Ikke Gjenta Disse Fallgruvene

- Ikke kjoer `prisma migrate deploy` mot eksisterende Neon uten aa sjekke
  baseline/applied-status foerst.
- Ikke commit `.env.local`, `.mcp.json`, `src/generated/prisma/`,
  `node_modules/`, `.next/` eller scratch-logger.
- Ikke stol paa kandidatlisten med feil query-param: kandidatsiden bruker `q`,
  mens samlet personellside bruker `search`.
- Ikke anta at public form-filter bare er klient-side. Server-side blokkering
  ble testet med manipulert `personnelId`.

## Hurtigkommandoer

```powershell
pnpm exec tsx --test "src/**/*.test.ts"
pnpm build
pnpm lint
git diff --check
pnpm exec prisma migrate status --config prisma.config.ts
```

Hvis dev-serveren maa startes:

```powershell
pnpm dev
```

Hvis Prisma-klienten er stale etter schema/migration:

```powershell
pnpm exec prisma generate --config prisma.config.ts
```
