import ExcelJS from "exceljs";

// ─── Styling helpers ─────────────────────────────────────────────────

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, size: 11 };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  row.border = {
    bottom: { style: "thin", color: { argb: "FF94A3B8" } },
  };
}

// ─── Column definitions ──────────────────────────────────────────────

const COLUMNS = [
  { header: "Fornavn *", key: "firstName", width: 18 },
  { header: "Etternavn *", key: "lastName", width: 18 },
  { header: "E-post", key: "email", width: 25 },
  { header: "Mobiltelefon", key: "mobile", width: 15 },
  { header: "Telefon", key: "phone", width: 15 },
  { header: "Tittel/Stilling", key: "title", width: 18 },
  { header: "Beskrivelse", key: "description", width: 30 },
  { header: "Adresse", key: "address", width: 18 },
  { header: "Postnummer", key: "postalCode", width: 15 },
  { header: "Poststed", key: "postalArea", width: 15 },
  { header: "By", key: "city", width: 15 },
  { header: "Land", key: "country", width: 15 },
  { header: "Nasjonalitet", key: "nationality", width: 15 },
  { header: "Kjønn", key: "gender", width: 15 },
  { header: "Fødselsdato", key: "birthDate", width: 15 },
  { header: "Rating", key: "rating", width: 15 },
  { header: "Innleid", key: "isContractor", width: 15 },
  { header: "Bedrift", key: "company", width: 22 },
  { header: "LinkedIn", key: "linkedin", width: 18 },
  { header: "Kompetanser", key: "competencies", width: 30 },
  { header: "Kurs/Sertifiseringer", key: "certifications", width: 30 },
  { header: "Førerkort", key: "driversLicense", width: 15 },
  { header: "Språk", key: "languages", width: 15 },
];

// ─── Info sheet data ─────────────────────────────────────────────────

const INFO_ROWS = [
  ["Fornavn", "Fornavn på kandidaten", "Påkrevd", "Tekst"],
  ["Etternavn", "Etternavn på kandidaten", "Påkrevd", "Tekst"],
  ["E-post", "E-postadresse", "Valgfritt", "Gyldig e-post"],
  ["Mobiltelefon", "Mobiltelefonnummer", "Valgfritt", "Tall, f.eks. 90000000"],
  ["Telefon", "Fasttelefon", "Valgfritt", "Tall"],
  ["Tittel/Stilling", "Nåværende stilling", "Valgfritt", "Tekst, f.eks. Elektriker"],
  ["Beskrivelse", "Kort beskrivelse av kandidaten", "Valgfritt", "Fritekst"],
  ["Adresse", "Gateadresse", "Valgfritt", "Tekst, f.eks. Storgata 1"],
  ["Postnummer", "Postnummer", "Valgfritt", "4 siffer, f.eks. 0001"],
  ["Poststed", "Poststed", "Valgfritt", "Tekst, f.eks. Oslo"],
  ["By", "By/kommune", "Valgfritt", "Tekst, f.eks. Oslo"],
  ["Land", "Land", "Valgfritt", "Tekst, f.eks. Norge"],
  ["Nasjonalitet", "Nasjonalitet", "Valgfritt", "Tekst, f.eks. Norsk"],
  ["Kjønn", "Kjønn", "Valgfritt", "Mann eller Kvinne"],
  ["Fødselsdato", "Fødselsdato", "Valgfritt", "dd.mm.yyyy, f.eks. 01.01.1990"],
  ["Rating", "Stjernerating", "Valgfritt", "0-5"],
  ["Innleid", "Om personen er innleid", "Valgfritt", "Ja eller Nei"],
  ["Bedrift", "Bedriften den innleide er leid inn til", "Valgfritt", "Tekst, f.eks. Equinor"],
  ["LinkedIn", "LinkedIn-profil URL", "Valgfritt", "URL"],
  ["Kompetanser", "Kommaseparerte ferdigheter", "Valgfritt", "Ex/ATEX, Instrument, Fiber"],
  ["Kurs/Sertifiseringer", "Kurs og sertifiseringer", "Valgfritt", "Fagbrev elektro, Fallsikring"],
  ["Førerkort", "Førerkortklasser", "Valgfritt", "B, BE, C, CE, D (kommaseparert)"],
  ["Språk", "Språk personen kan", "Valgfritt", "Norsk, Engelsk, Polsk"],
];

// ─── Template generator ──────────────────────────────────────────────

/**
 * Genererer en Excel-mal for kandidatimport.
 * Returnerer en ArrayBuffer som kan sendes direkte i NextResponse.
 */
export async function generateCandidateTemplate(): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NRT Tools";
  workbook.created = new Date();

  // ─── Sheet 1: Kandidater ─────────────────────────────────────────
  const sheet = workbook.addWorksheet("Kandidater");
  sheet.columns = COLUMNS;
  styleHeader(sheet.getRow(1));

  // Data validations — the runtime API exists but is missing from the type defs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dv = (sheet as any).dataValidations;

  // Data validation: Kjønn (column N = 14)
  dv.add("N2:N1000", {
    type: "list",
    allowBlank: true,
    formulae: ['"Mann,Kvinne"'],
    showErrorMessage: true,
    errorTitle: "Ugyldig verdi",
    error: "Velg Mann eller Kvinne",
  });

  // Data validation: Rating (column P = 16)
  dv.add("P2:P1000", {
    type: "list",
    allowBlank: true,
    formulae: ['"0,1,2,3,4,5"'],
    showErrorMessage: true,
    errorTitle: "Ugyldig verdi",
    error: "Velg en verdi mellom 0 og 5",
  });

  // Data validation: Innleid (column Q = 17)
  dv.add("Q2:Q1000", {
    type: "list",
    allowBlank: true,
    formulae: ['"Ja,Nei"'],
    showErrorMessage: true,
    errorTitle: "Ugyldig verdi",
    error: "Velg Ja eller Nei",
  });

  // Note on Førerkort (column V = 22, shifted by Bedrift column)
  sheet.getCell("V1").note = "B, BE, C, CE, D (kommaseparert)";

  // Example row (row 2)
  sheet.addRow({
    firstName: "Ola",
    lastName: "Nordmann",
    email: "ola@example.com",
    mobile: "90000000",
    phone: "",
    title: "Elektriker",
    description: "",
    address: "Storgata 1",
    postalCode: "0001",
    postalArea: "Oslo",
    city: "Oslo",
    country: "Norge",
    nationality: "Norsk",
    gender: "Mann",
    birthDate: "01.01.1990",
    rating: "3",
    isContractor: "Ja",
    company: "Equinor",
    linkedin: "",
    competencies: "Ex/ATEX",
    certifications: "Fagbrev elektro",
    driversLicense: "B",
    languages: "Norsk",
  });

  // ─── Sheet 2: Info ───────────────────────────────────────────────
  const info = workbook.addWorksheet("Info");
  info.columns = [
    { header: "Kolonne", key: "column", width: 22 },
    { header: "Beskrivelse", key: "description", width: 35 },
    { header: "Påkrevd/Valgfritt", key: "required", width: 18 },
    { header: "Format/Eksempel", key: "format", width: 35 },
  ];

  // Title row
  const titleRow = info.getRow(1);
  titleRow.getCell(1).value = "Informasjon om kolonnene";
  titleRow.getCell(1).font = { bold: true, size: 14 };
  info.mergeCells("A1:D1");

  // Header row
  const infoHeaderRow = info.getRow(2);
  infoHeaderRow.values = ["Kolonne", "Beskrivelse", "Påkrevd/Valgfritt", "Format/Eksempel"];
  styleHeader(infoHeaderRow);

  // Info data rows
  for (const row of INFO_ROWS) {
    info.addRow(row);
  }

  return await workbook.xlsx.writeBuffer();
}
