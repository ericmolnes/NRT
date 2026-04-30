# Manual E2E Checklist: Personellkategori, Skjema-filter og Varsler

Dato: 2026-04-29

Arbeidsmappe: `C:\Users\EricMolnes\Dev\apps\nrt`

Base-URL lokalt: `http://localhost:3000` med mindre `pnpm dev` velger en annen port.

Formaal: bekrefte at faktisk brukerflyt fungerer for personellkategorier `ANSATT`, `INNLEID`, `KANDIDAT`, skjemalinker med kategori- og avdelingsfilter, og tilgangsforesporsler med admin-varsel.

Dette dokumentet er en replaybar sjekkliste. Ikke fyll ut pass/fail foer stegene faktisk er kjort av menneske eller browser-agent.

---

## 1. Oppstart

Kjor fra arbeidsmappen:

```powershell
cd C:\Users\EricMolnes\Dev\apps\nrt
pnpm install
pnpm db:seed
pnpm dev
```

Notater:

- `pnpm install` kan hoppes over hvis `node_modules` allerede er oppdatert.
- `pnpm db:seed` kan hoppes over hvis databasen allerede har testdataene under.
- Noter faktisk dev-URL hvis porten ikke er `3000`.

| Felt | Verdi |
| --- | --- |
| Faktisk URL | `http://localhost:3000` |
| RUN_ID | `20260429-codex-153106` |
| Seed kjort? | Nei, E2E-data opprettet/validert direkte for denne runnen |
| Dev-server startet? | Ja, `pnpm dev` paa port `3000` |
| Browser/agent | Codex browser-agent + headless Edge/Playwright med lokal NextAuth test-session |
| Dato/tid | 2026-04-29 ca. 15:31-15:54 Europe/Oslo |

Velg `RUN_ID` en gang foer du oppretter data, f.eks. `20260429-1530`. Bruk samme verdi i alle navn, e-poster og skjematitler under. Dette gjor at testen kan repeteres uten kollisjon med tidligere E2E-data.

---

## 2. Testdata som maa finnes

Seed eller opprett manuelt folgende data foer verifisering. Bruk valgt `RUN_ID` fra seksjon 1 konsekvent i alle verdier under.

### Personell

Opprett eller finn disse testpersonene. Fyll inn faktisk ID under execution, men ikke bytt rolle/kategori/avdeling.

| Rolle i test | Kategori | Navn | E-post | Avdeling | Andre felt | Faktisk ID |
| --- | --- | --- | --- | --- | --- | --- |
| Ansatt | `ANSATT` | `E2E Ansatt Filtertest 20260429-codex-153106` | `e2e.ansatt.filtertest+20260429-codex-153106@example.test` | `E2E Drift 20260429-codex-153106` | Rolle: `E2E Tekniker`; status aktiv | `cmok3fer30000ccwcdnngf8v8` |
| Innleid | `INNLEID` | `E2E Innleid Filtertest 20260429-codex-153106` | `e2e.innleid.filtertest+20260429-codex-153106@example.test` | `E2E Drift 20260429-codex-153106` | Rolle: `E2E Konsulent`; status aktiv | `cmok3feyx0002ccwcw93r7s12` |
| Kandidat | `KANDIDAT` | `E2E Kandidat Filtertest 20260429-codex-153106` | `e2e.kandidat.filtertest+20260429-codex-153106@example.test` | `E2E Rekruttering 20260429-codex-153106` | Rolle: `E2E Kandidat`; `isEmployee=false`, `isContractor=false` | `cmok3ff190004ccwc5zb3m2gs` |

Manual data recipe:

- [ ] Logg inn som admin.
- [ ] Aapne `http://localhost:3000/personell`.
- [ ] Opprett `E2E Ansatt Filtertest <RUN_ID>` via `Nytt personell` hvis personen ikke finnes.
- [ ] Sett eller bekreft kategori `ANSATT`, avdeling `E2E Drift <RUN_ID>`, e-post `e2e.ansatt.filtertest+<RUN_ID>@example.test`, rolle `E2E Tekniker`, aktiv status.
- [ ] Opprett `E2E Innleid Filtertest <RUN_ID>` via `Nytt personell` eller innleidflyt hvis personen ikke finnes.
- [ ] Sett eller bekreft kategori `INNLEID`, avdeling `E2E Drift <RUN_ID>`, e-post `e2e.innleid.filtertest+<RUN_ID>@example.test`, rolle `E2E Konsulent`, aktiv status.
- [ ] Aapne `http://localhost:3000/personell/kandidater`.
- [ ] Finn eller opprett `E2E Kandidat Filtertest <RUN_ID>`.
- [ ] Bekreft at kandidaten har e-post `e2e.kandidat.filtertest+<RUN_ID>@example.test`, avdeling `E2E Rekruttering <RUN_ID>`, og ikke er aktiv ansatt. For candidate-to-innleid-testen maa `isEmployee=false` eller `employeeEnd` vaere satt, ellers vises ikke knappen `Marker som innleid`.

### Brukere

Bruk eller opprett disse testkontoene. Fyll inn faktisk auth-provider/ID under execution.

| Rolle i test | Tilgangsnivaa | Navn | E-post | Forventet startside | Faktisk ID/provider |
| --- | --- | --- | --- | --- | --- |
| Admin | `ADMIN` | `Codex E2E Admin` | bootstrap admin e-post fra `.env.local` | `/dashboard`, med tilgang til `/settings` | lokal NextAuth JWT test-session |
| Minimum user | `MINIMUM` | `E2E Minimum 20260429-codex-153106` | `e2e.minimum+20260429-codex-153106@example.test` | `/waiting-access` | lokal NextAuth JWT test-session, Entra-id `e2e-minimum-20260429-codex-153106` |

| Loginfelt | Verdi |
| --- | --- |
| Admin login source/credentials | Eksisterende Microsoft-session ble brukt i Codex browser; headless E2E brukte lokal NextAuth JWT for bootstrap-admin |
| Minimum login source/credentials | Lokal NextAuth JWT med test-e-post; ingen ekstern Microsoft-innlogging |

Manual account recipe:

- [ ] Logg inn med eksisterende admin eller seedet admin.
- [ ] Aapne `http://localhost:3000/settings`.
- [ ] Bekreft at admin-kontoen som skal brukes har `ADMIN`.
- [ ] Opprett eller finn `E2E Minimum <RUN_ID>` / `e2e.minimum+<RUN_ID>@example.test`.
- [ ] Sett eller bekreft tilgangsnivaa `MINIMUM`.
- [ ] Ikke godkjenn minimum-brukeren foer access-request-testen i seksjon 7 er ferdig.

---

## 3. Personelliste: kategori-filter

Maal: `ANSATT`, `INNLEID` og `KANDIDAT` kan filtreres og viser riktig personell.

Merk: `/personell?category=ANSATT`, `/personell?category=INNLEID` og `/personell?category=KANDIDAT` er query-param-stier som skal testes direkte, selv hvis siden ikke har synlig kategori-dropdown.

Start som admin eller vanlig bruker med tilgang:

```text
http://localhost:3000/personell
```

### 3.1 Ansatte

- [ ] Aapne `http://localhost:3000/personell?category=ANSATT`.
- [ ] Bekreft at testpersonen med kategori `ANSATT` vises.
- [ ] Bekreft at testpersonen med kategori `INNLEID` ikke vises i samme liste.
- [ ] Bekreft at testpersonen med kategori `KANDIDAT` ikke vises i samme liste.

| Forventet resultat | Faktisk resultat | Pass/Fail | Bevis/notat |
| --- | --- | --- | --- |
| Kun ansatte i listen | `E2E Ansatt Filtertest 20260429-codex-153106` vises; innleid og kandidat vises ikke | PASS | URL: `/personell?category=ANSATT&search=20260429-codex-153106`; headless smoke: `ansatt=true`, `innleid=false`, `kandidat=false` |

### 3.2 Innleide

- [ ] Aapne `http://localhost:3000/personell?category=INNLEID`.
- [ ] Bekreft at testpersonen med kategori `INNLEID` vises.
- [ ] Kryssjekk gjerne ogsaa `http://localhost:3000/personell/innleide`.
- [ ] Bekreft at `ANSATT` og `KANDIDAT` ikke ligger i innleidresultatet.

| Forventet resultat | Faktisk resultat | Pass/Fail | Bevis/notat |
| --- | --- | --- | --- |
| Kun innleide i listen | `E2E Innleid Filtertest 20260429-codex-153106` vises; ansatt og kandidat vises ikke | PASS | URL: `/personell?category=INNLEID&search=20260429-codex-153106`; kryssjekk `/personell/innleide?q=20260429-codex-153106` |

### 3.3 Kandidater

- [ ] Aapne `http://localhost:3000/personell?category=KANDIDAT`.
- [ ] Bekreft at testpersonen med kategori `KANDIDAT` vises.
- [ ] Kryssjekk gjerne ogsaa `http://localhost:3000/personell/kandidater`.
- [ ] Bekreft at `ANSATT` og `INNLEID` ikke ligger i kandidatresultatet.

| Forventet resultat | Faktisk resultat | Pass/Fail | Bevis/notat |
| --- | --- | --- | --- |
| Kun kandidater i listen | `E2E Kandidat Filtertest 20260429-codex-153106` vises; ansatt og innleid vises ikke | PASS | URL: `/personell?category=KANDIDAT&search=20260429-codex-153106` |

---

## 4. Kandidat markert som innleid

Maal: en kandidat som markeres som innleid forsvinner fra kandidatflyten og vises som innleid.

Forutsetning: bruk `E2E Kandidat Filtertest <RUN_ID>` fra seksjon 2. Kandidaten maa ikke vaere aktiv ansatt. Hvis kandidaten har `isEmployee=true` uten `employeeEnd`, er knappen skjult; bruk en kandidat der `isEmployee=false` eller `employeeEnd` er satt.

- [ ] Aapne `http://localhost:3000/personell/kandidater`.
- [ ] Finn `E2E Kandidat Filtertest <RUN_ID>`.
- [ ] Klikk kandidatnavnet for aa aapne candidate detail.
- [ ] I detail sheet/header, klikk knappen `Marker som innleid`.
- [ ] Bekreft dialogen: `Marker E2E Kandidat Filtertest <RUN_ID> som innleid? De vil bli tilgjengelige for evaluering og skjemaer.`
- [ ] Noter om dialogen bruker noyaktig navn eller annen visning av kandidatnavnet.
- [ ] Oppdater `http://localhost:3000/personell/kandidater`.
- [ ] Bekreft at kandidaten ikke lenger vises i kandidatlisten.
- [ ] Aapne `http://localhost:3000/personell/innleide`.
- [ ] Bekreft at samme person vises som innleid.
- [ ] Aapne `http://localhost:3000/personell?category=INNLEID`.
- [ ] Bekreft at samme person ogsaa vises i samlet personelliste filtrert paa `INNLEID`.

| Forventet resultat | Faktisk resultat | Pass/Fail | Bevis/notat |
| --- | --- | --- | --- |
| Kandidat flyttes fra kandidatflyt til innleidflyt | Testkandidat `((Aaa E2E Overgang 20260429-codex-153106` ble markert som innleid via UI, forsvant fra `/personell/kandidater?q=20260429-codex-153106` og vises i `/personell/innleide?q=20260429-codex-153106` og `/personell?category=INNLEID&search=20260429-codex-153106` | PASS | Confirmtekst: `Marker ((Aaa E2E Overgang 20260429-codex-153106 som innleid? ...`; DB: `isContractor=true`, aapen `ContractorPeriod`, Personnel `cmok40o500001dswcvqylvk4v` med rolle `Innleid` |

---

## 5. Opprett evalueringslink med kategori- og avdelingsfilter

Maal: admin kan opprette skjemalink som bare tillater valgt kategori og avdeling.

Start som admin:

```text
http://localhost:3000/skjema
```

- [ ] Aapne `http://localhost:3000/skjema`.
- [ ] I `Opprett nytt skjema`, sett tittel til `E2E filtertest <RUN_ID>`.
- [ ] Velg skjematype `Evaluering`.
- [ ] Velg tilgangskontroll `Aapent` for base-run. Velg bare `Passord` hvis denne auth-modusen ogsaa skal testes.
- [ ] Hvis `Passord` velges, noter valgt passord i tabellen under.
- [ ] Under `Distribusjon`, velg kategori `Innleide`.
- [ ] Velg avdeling `E2E Drift <RUN_ID>`, der testpersonen `INNLEID` finnes.
- [ ] Bekreft at filterforhaandsvisningen sier at lenken tillater innleide i valgt avdeling.
- [ ] La `Begrens til personell` staa tomt for aa teste kategori/avdeling, eller velg bare innleid testperson hvis du vil teste ekstra snevert filter.
- [ ] Klikk `Opprett skjemalink`.
- [ ] Kopier public URL fra aktiv lenke, format `http://localhost:3000/s/<token>`.
- [ ] Noter `usageCount` for lenken foer public innsending.

| Forventet resultat | Faktisk resultat | Pass/Fail | Bevis/notat |
| --- | --- | --- | --- |
| Link opprettes og viser `/s/<token>` | UI opprettet link med tittel `E2E filtertest 20260429-codex-153106 ui-1548`; filter-preview viste `Innleide` og `E2E Drift 20260429-codex-153106`; DB viser token `cmok43tf8000gdswc1zhlow0c` | PASS | URL: `http://localhost:3000/s/cmok43tf8000gdswc1zhlow0c`; `categoriesFilter=["INNLEID"]`, `departmentsFilter=["E2E Drift 20260429-codex-153106"]` |

| Felt | Verdi |
| --- | --- |
| Skjematittel | `E2E filtertest 20260429-codex-153106 ui-1548` |
| Public URL | `http://localhost:3000/s/cmok43tf8000gdswc1zhlow0c` |
| Kategori-filter | `INNLEID` |
| Avdelingsfilter | `E2E Drift 20260429-codex-153106` |
| Auth mode | `NONE` |
| Passord hvis auth mode er `Passord` | Ikke brukt |
| usageCount foer public innsending | `0` |

---

## 6. Public form: person utenfor filter kan ikke sende

Maal: public skjema validerer valgt person mot kategori- og avdelingsfilter ved innsending.

Bruk public URL fra seksjon 5.

- [ ] Aapne public URL i ny fane eller inkognito: `http://localhost:3000/s/<token>`.
- [ ] Hvis passord er valgt, skriv inn passordet.
- [ ] Forsok aa velge en person utenfor filteret, f.eks. `ANSATT` i samme/annen avdeling eller `KANDIDAT`.
- [ ] Hvis personen ikke er valgbar i UI, noter det som pass for klient-side blokkering.
- [ ] Server-side manipulert form/POST er en valgfri avansert sjekk. Marker den som `skipped` hvis tester/browser-agent ikke har en trygg maate aa craft'e POST uten aa lese eller endre implementasjonskode.
- [ ] Hvis personen kan velges via UI, eller hvis trygg manipulert POST brukes, forsok innsending.
- [ ] Bekreft at innsending ikke blir lagret for person utenfor filter.
- [ ] Bekreft at bruker ser en tydelig feil eller at personen aldri kan velges.
- [ ] Velg deretter gyldig `INNLEID` i valgt avdeling og send inn en minimal gyldig evaluering.
- [ ] Aapne `http://localhost:3000/skjema` som admin og noter `usageCount` etter innsending.
- [ ] Bekreft at gyldig innsending blir lagret og at lenkens `usageCount` har okt fra verdien i seksjon 5.

| Scenario | Forventet resultat | Faktisk resultat | Pass/Fail | Bevis/notat |
| --- | --- | --- | --- | --- |
| Person utenfor filter | Innsending blokkeres | Public search viser gyldig innleid, men ikke ansatt/kandidat; manipulert POST med ansatt-ID returnerte `Valgt personell er ikke tilgjengelig for dette skjemaet` | PASS | Etter avvist innsending: `usageCount=0`, `submissions=0` |
| Person innenfor filter | Innsending lagres | Gyldig innsending for `E2E Innleid Filtertest 20260429-codex-153106` viste `Takk for evalueringen!` | PASS | Etter gyldig innsending: `usageCount=1`, `submissions=1`, siste evaluering score `8` |

| usageCount-sjekk | Verdi |
| --- | --- |
| Foer public innsending | `0` |
| Etter gyldig innsending | `1` |
| Forventet sammenligning | Etter = foer + 1 |
| Faktisk sammenligning | PASS: `1 = 0 + 1` |

---

## 7. Tilgangsforesporsel og admin-varsel

Maal: `MINIMUM`-bruker rutes til venteside, oppretter tilgangsforesporsel, og admin faar in-app/admin-notifikasjon. Hvis SMTP mangler, skal e-poststien hoppes trygt over uten aa stoppe foresporselen.

### 7.1 Minimum user

- [ ] Logg ut av admin.
- [ ] Logg inn som testbruker med `MINIMUM`.
- [ ] Bekreft at brukeren redirectes til `http://localhost:3000/waiting-access`.
- [ ] Bekreft at siden viser at tilgangsforesporsel er sendt eller allerede venter.
- [ ] Noter tidspunktet som vises.

| Forventet resultat | Faktisk resultat | Pass/Fail | Bevis/notat |
| --- | --- | --- | --- |
| Minimum user ser venteside og pending request | Testbruker `E2E Minimum 20260429-codex-153106` fikk `/waiting-access`; siden viste `Tilgangsforesporsel sendt` | PASS | AccessRequest `cmok46pek000idswczithd9hm`, status `PENDING`, opprettet `2026-04-29T13:52:21.020Z` |

### 7.2 Admin notification

- [ ] Logg inn som admin.
- [ ] Aapne `http://localhost:3000/settings`.
- [ ] Bekreft at tilgangsforesporselen finnes i admin-panelet.
- [ ] Sjekk notification bell i toppbaren.
- [ ] Bekreft at admin-varsel finnes for tilgangsforesporselen.
- [ ] Ikke godkjenn eller avvis request med mindre testen eksplisitt trenger opprydding.

| Forventet resultat | Faktisk resultat | Pass/Fail | Bevis/notat |
| --- | --- | --- | --- |
| Admin ser access request og notification | DB viser pending access request og ulest admin notification for samme e-post | PASS | SystemNotification `cmok46pg5000jdswcb5mvb32y`, kind `ACCESS_REQUEST`, `targetLevel=ADMIN`, `readAt=null` |

### 7.3 SMTP mangler

For denne testen skal minst en paakrevd SMTP-env mangle i serverprosessen. Appen leser disse env-varene for SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_TO_ADMIN`.

- [ ] Bekreft om `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_TO_ADMIN` er satt i den serverprosessen som faktisk kjorer `pnpm dev`.
- [ ] Hvis alle SMTP-varene er satt i serverprosessen, ikke endre env midt i run. Enten stopp dev-serveren og start den paa nytt med minst en paakrevd SMTP-var unset, eller marker SMTP-fravaer-testen som `skipped` med grunn.
- [ ] Hvis minst en paakrevd SMTP-var mangler, fortsett testen.
- [ ] Gjenta minimum user-flyten fra 7.1 med SMTP fravaerende.
- [ ] Bekreft at access request fortsatt opprettes.
- [ ] Bekreft at admin notification fortsatt opprettes.
- [ ] Bekreft at appen ikke krasjer selv om e-post ikke sendes.
- [ ] Hvis loggen viser melding om at notification email ble hoppet over, noter den her.

| Forventet resultat | Faktisk resultat | Pass/Fail | Bevis/notat |
| --- | --- | --- | --- |
| Minst en SMTP-var mangler: e-post hoppes trygt over, in-app/admin notification finnes | Alle seks SMTP-vars manglet i `.env.local`; access request og in-app/admin notification ble likevel opprettet, appen krasjet ikke | PASS | E-poststi forventet skipped; ingen SMTP-vars satt |

| SMTP-env | Satt i serverprosessen? | Notat |
| --- | --- | --- |
| `SMTP_HOST` | Nei | Mangler |
| `SMTP_PORT` | Nei | Mangler |
| `SMTP_USER` | Nei | Mangler |
| `SMTP_PASS` | Nei | Mangler |
| `SMTP_FROM` | Nei | Mangler |
| `SMTP_TO_ADMIN` | Nei | Mangler |

---

## 8. Sluttkontroll

- [ ] Alle URL-er brukt i testen er notert.
- [ ] Alle testkontoer er notert.
- [ ] Alle pass/fail-felt er fylt ut.
- [ ] Eventuelle avvik har skjermbilde, loggnotat eller kort reproduksjon.
- [ ] Ingen steg krever lesing av implementasjonskode.

| Omraade | Status | Notat |
| --- | --- | --- |
| Personellkategori-filter | PASS | `ANSATT`, `INNLEID`, `KANDIDAT` verifisert via query-param URLs |
| Kandidat til innleid | PASS | UI confirm + DB-kryssjekk |
| Skjemalink filter | PASS | UI-opprettet link med `INNLEID` + `E2E Drift` |
| Public filtervalidering | PASS | UI-sok ekskluderte utenfor-filter; manipulert POST ble server-side blokkert; gyldig innsending lagret |
| Access request | PASS | MINIMUM venteside opprettet pending request og admin notification |
| SMTP-fravaer | PASS | SMTP manglet; request/notification fortsatte uten e-post |
