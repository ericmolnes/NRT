# Design: Manuelt opprette person (Ansatt eller Innleid)

**Dato:** 2026-04-17
**Status:** Design — under review

## Kontekst

I dag har `/personell/ny` et enkelt skjema (navn, rolle, e-post, telefon, avdeling) som oppretter kun `Personnel`-rad uten `RecmanCandidate`. Innleide kan kun opprettes via Excel-import på `/personell/innleide`, som fanger opp langt flere felt (adresse, skills, kurs, språk, osv.) og oppretter `RecmanCandidate + ContractorPeriod + Personnel` i én transaksjon.

Dette gjør to ting vanskelig:
1. Å legge til én ny person uten Excel — må enten kjøre Excel-importen med ett element eller leve med det enkle skjemaet som mangler halvparten av feltene.
2. Å velge om personen er Ansatt eller Innleid i samme flyt — de to flyene er adskilt.

Brukerens intent: fra **både** `/personell` og `/personell/innleide` skal det være en "Ny person"-knapp som åpner samme rike skjema med toggle for Ansatt/Innleid.

## Mål

- Én delt form-komponent tilgjengelig fra begge sider via Sheet/dialog.
- Full feltdekning som Excel-importen (navn, kontakt, adresse, personlig, kompetanse).
- Toggle for Innleid — defaulter basert på hvilken side skjemaet åpnes fra.
- Alltid opprett `RecmanCandidate + Personnel`. Hvis Innleid: også `ContractorPeriod`.
- Gjenbruk `handleCreate`-logikken fra Excel-importen (ingen duplisering).

## Ikke-mål

- Redigere eksisterende personer (gjøres allerede andre steder).
- Batch-opprettelse (Excel-import dekker det).
- Rekursiv synk til Recman — ny person får `recmanId = local-<timestamp>-<random>` som erstattes av neste sync-jobb (samme som Excel-importen i dag).

## Arkitektur

### Ny delt server-funksjon

Flytt dagens `handleCreate` ut av [src/app/(authenticated)/personell/innleide/import-actions.ts](src/app/(authenticated)/personell/innleide/import-actions.ts) til:

**Ny fil:** `src/lib/personell/create-candidate.ts`
```ts
export async function createCandidateWithPersonnel(rowData: CandidateRowData): Promise<string>
```

- Input: samme `rowData`-shape som `ImportDecision["rowData"]` (døpes om til `CandidateRowData`).
- Output: candidate-ID.
- Logikk: nøyaktig samme transaksjon som dagens `handleCreate`.

`executeImport` i `import-actions.ts` og den nye manuelle actionen kaller begge denne funksjonen.

### Ny server action

**Fil:** [src/app/(authenticated)/personell/ny/actions.ts](src/app/(authenticated)/personell/ny/actions.ts) — legg til:

```ts
export async function createPersonManual(_prev: ActionState, formData: FormData): Promise<ActionState>
```

Ansvar:
- Validerer via ny Zod-schema `createPersonManualSchema` i `src/lib/validations/personnel.ts`.
- Bygger `CandidateRowData` fra formData (komma-separerte arrays parses via eksisterende `splitCommaSeparated`).
- Kaller `createCandidateWithPersonnel`.
- `revalidatePath("/personell")`, `/personell/innleide`, `/personell/kandidater`.

Dagens `createPersonnel` beholdes for bakoverkompatibilitet, men `PersonnelForm` byttes ut med det nye skjemaet.

### Ny form-komponent

**Fil:** `src/components/personell/create-person-sheet.tsx` (client)

Struktur:
- Rot-komponent eksporterer `<CreatePersonSheet defaultContractor={boolean} trigger={ReactNode} />`.
- Inne i Sheet: form med følgende seksjoner (alle synlige, scrollbart):

| Seksjon | Felter |
|---------|--------|
| Basis | Fornavn*, Etternavn*, E-post, Mobil, Telefon, Stillingstittel |
| Rolle | Innleid-toggle (default fra prop), Bedrift (vis kun hvis Innleid=på) |
| Adresse | Gateadresse, Postnr, Poststed, By, Land, Nasjonalitet |
| Personlig | Kjønn, Fødselsdato, Rating (0–5), LinkedIn |
| Kompetanse | Skills, Kurs, Førerkort, Språk (alle tekstfelt, komma-separert) |

Actions:
- `Opprett`: kaller `createPersonManual` via `useActionState`.
- `Avbryt`: lukker Sheet.

### Knapp-integrasjon

- [src/app/(authenticated)/personell/page.tsx](src/app/(authenticated)/personell/page.tsx) — legg til `<CreatePersonSheet defaultContractor={false} />` med Button-trigger "Ny person" i header.
- [src/components/innleide/contractor-list-view.tsx](src/components/innleide/contractor-list-view.tsx) — erstatt/kompletter eksisterende "Ny innleid"-knapp med `<CreatePersonSheet defaultContractor={true} />`.

### Dagens `/personell/ny`-side

Beholdes som fullside-variant for de som foretrekker URL-routing:
- Erstatt `<PersonnelForm />` i [src/app/(authenticated)/personell/ny/page.tsx](src/app/(authenticated)/personell/ny/page.tsx) med et nytt `<CreatePersonInline />` som gjenbruker samme form-innhold uten Sheet-wrapper.
- Sletter ikke `createPersonnel`-action, men `PersonnelForm.tsx` som ikke lenger brukes.

## Dataflyt

```
Bruker → Sheet (CreatePersonSheet)
  ↓ submit
formAction (createPersonManual)
  ↓ zod-validering
CandidateRowData
  ↓
createCandidateWithPersonnel (lib/personell)
  ↓ transaksjon
  ├─ RecmanCandidate.create (temp recmanId, alle felt)
  ├─ if isContractor:
  │    ├─ ContractorPeriod.create(startDate=now, company)
  │    ├─ Personnel.create(role="Innleid", status="ACTIVE")
  │    └─ RecmanCandidate.update(personnelId)
  └─ else:
       ├─ Personnel.create(role=title || "Ansatt", status="ACTIVE")
       └─ RecmanCandidate.update(personnelId)
  ↓
revalidatePath → Sheet lukkes → bruker ser ny person i listen
```

## Validering (Zod)

```ts
createPersonManualSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  title: z.string().optional(),
  isContractor: z.boolean(),
  company: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  postalPlace: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(), // ISO-format, parses til Date i action
  rating: z.coerce.number().int().min(0).max(5).optional(),
  linkedIn: z.string().url().optional().or(z.literal("")),
  skills: z.string().optional(), // komma-separert, splittes i action
  courses: z.string().optional(),
  driversLicense: z.string().optional(),
  languages: z.string().optional(),
});
```

## Feilhåndtering

- Validation-feil → vises per-felt i form.
- DB-feil → vises som toast/melding nederst.
- E-post-duplikat: ikke hardt avvist (eksisterer allerede duplikater), men varsel vises.

## Testing (manuelt)

1. `/personell` → klikk "Ny person" → fyll ut alt → bekreft: person dukker opp i liste, har ikke ContractorPeriod, har rolle.
2. `/personell/innleide` → klikk "Ny innleid" → toggle forblir på → fyll ut bedrift → bekreft: ContractorPeriod opprettet med bedrift, Personnel.role="Innleid", person dukker opp både på innleide- og personell-oversikt.
3. Veksle toggle fra Innleid til Ansatt midt i utfylling → bedriftsfeltet skjules, Innleid-felt ikke sendt.
4. Komma-separerte felter: `Mekaniker, Elektriker` → lagres som `[{name:"Mekaniker"}, {name:"Elektriker"}]` i skills.
5. Valideringsfeil: tom fornavn → form blokkeres, feilmelding vises.
6. E-post kollisjon: opprett to med samme e-post → bekreft at begge opprettes (duplikat tillatt).

## Relaterte fikser (implementert sammen med dette)

### Skjema-picker viser aktive innleide uavhengig av Personnel.role

[src/lib/queries/evaluations.ts](src/lib/queries/evaluations.ts) — `getAllPersonnel` inkluderer nå `recmanCandidate.isContractor` og `isEmployee` i select.

[src/components/skjema/create-link-form.tsx](src/components/skjema/create-link-form.tsx) — client-filter for rolle="Innleid" matcher nå `recmanCandidate.isContractor === true || role === "Innleid"`. For rolle="Ansatt" matcher `isEmployee && !isContractor` eller legacy Personell uten RecmanCandidate.

### Kandidat→Innleid toggle fra CandidateDetail

[src/components/recman/candidate-detail.tsx](src/components/recman/candidate-detail.tsx) — ny "Marker som innleid"/"Fjern innleid-status"-knapp i header, synlig når kandidaten ikke er aktiv ansatt. Kaller eksisterende `toggleContractorWithHistory` med confirm-dialog.

## Risiko / åpne spørsmål

- **Duplikater**: Excel-importen har AI-matching for å unngå duplikater. Manuell opprettelse har det IKKE — brukeren kan oppdage og rydde opp etterpå. Akseptabelt for MVP.
- **Recman-synk**: Ny person får `local-<id>` som recmanId. Neste cron (06:00) pusher til Recman. Mellomtiden kan bruker ikke oppdatere Recman-felt på denne personen. Samme oppførsel som dagens Excel-import — akseptabelt.
- **Rolle-feltet for ikke-innleide**: Dagens `/ny`-form krever rolle. Nytt skjema bruker `title` (stillingstittel) som rolle for ansatte, og hardkoder "Innleid" for innleide. Dette matcher Excel-importens oppførsel.

## Filer som endres/opprettes

| Fil | Handling |
|-----|---------|
| `src/lib/personell/create-candidate.ts` | **NY** — delt server-funksjon |
| `src/lib/validations/personnel.ts` | Legg til `createPersonManualSchema` |
| `src/app/(authenticated)/personell/innleide/import-actions.ts` | `handleCreate` flyttes ut; importerer fra delt fil |
| `src/app/(authenticated)/personell/ny/actions.ts` | Legg til `createPersonManual` |
| `src/app/(authenticated)/personell/ny/page.tsx` | Bruk nytt inline-skjema |
| `src/app/(authenticated)/personell/page.tsx` | Legg til "Ny person"-knapp + Sheet |
| `src/components/innleide/contractor-list-view.tsx` | Kople "Ny innleid"-knapp til Sheet |
| `src/components/personell/create-person-sheet.tsx` | **NY** — form-komponent |
| `src/components/personell/personnel-form.tsx` | **Slettes** (erstattes) |
