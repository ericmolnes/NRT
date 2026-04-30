export type CourseSuggestion = {
  name: string;
  issuer: string | null;
  certificateNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  confidence: number;
  sourceText: string;
};

export type CourseDocumentParserStatus =
  | "SUGGESTIONS_CREATED"
  | "NO_SUGGESTIONS"
  | "FAILED";

export type ParseCourseDocumentInput = {
  fileName: string;
  text?: string | null;
};

export type ParseCourseDocumentResult = {
  status: CourseDocumentParserStatus;
  summary: string;
  suggestions: CourseSuggestion[];
};

const GENERIC_FILE_NAMES = /^(scan|skann|document|dokument|file|image|img)[-_ ]?\d*$/i;

export function parseCourseDocument(
  input: ParseCourseDocumentInput
): ParseCourseDocumentResult {
  const text = normalizeWhitespace(input.text ?? "");
  const sourceText = compactSourceText(input.text ?? "");

  const fromText = parseFromText(text, sourceText);
  if (fromText) {
    return {
      status: "SUGGESTIONS_CREATED",
      summary: "Fant 1 kursforslag",
      suggestions: [fromText],
    };
  }

  const fileNameSuggestion = parseFromFileName(input.fileName);
  if (fileNameSuggestion) {
    return {
      status: "SUGGESTIONS_CREATED",
      summary: "Fant 1 svakt kursforslag fra filnavn",
      suggestions: [fileNameSuggestion],
    };
  }

  return {
    status: "NO_SUGGESTIONS",
    summary: "Ingen kursforslag funnet",
    suggestions: [],
  };
}

function parseFromText(text: string, sourceText: string): CourseSuggestion | null {
  if (!text) return null;

  const name =
    findValue(text, ["kurs", "course", "certificate", "sertifikat"]) ??
    inferKnownCourseName(text);
  if (!name) return null;

  const issuer = findValue(text, ["utsteder", "issuer", "issued by"]);
  const certificateNumber = findValue(text, [
    "sertifikatnr",
    "sertifikatnummer",
    "certificate no",
    "certificate number",
    "cert no",
  ]);
  const issueDate = normalizeDate(
    findValue(text, ["utstedt", "issued", "issue date"])
  );
  const expiryDate = normalizeDate(
    findValue(text, ["utloper", "utløper", "expires", "expiry", "expiry date"])
  );

  const filled = [issuer, certificateNumber, issueDate, expiryDate].filter(Boolean).length;
  const confidence = filled >= 3 ? 0.9 : filled >= 1 ? 0.7 : 0.55;

  return {
    name,
    issuer,
    certificateNumber,
    issueDate,
    expiryDate,
    confidence,
    sourceText: sourceText || text,
  };
}

function parseFromFileName(fileName: string): CourseSuggestion | null {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!base || GENERIC_FILE_NAMES.test(base)) return null;
  if (!/(kurs|course|bevis|certificate|sertifikat|fallsikring|stropp|varmt arbeid|hot work|g11)/i.test(base)) {
    return null;
  }

  return {
    name: titleCase(base),
    issuer: null,
    certificateNumber: null,
    issueDate: null,
    expiryDate: null,
    confidence: 0.35,
    sourceText: fileName,
  };
}

function findValue(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`${escaped}\\s*[:\\-]\\s*([^\\n\\r]+)`, "i"));
    if (match?.[1]) {
      return cleanValue(match[1]);
    }
  }
  return null;
}

function inferKnownCourseName(text: string): string | null {
  const known = ["fallsikring", "varmt arbeid", "hot work", "g11 stropp"];
  const lower = text.toLowerCase();
  const found = known.find((item) => lower.includes(item));
  return found ? titleCase(found) : null;
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();

  const iso = trimmed.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const norwegian = trimmed.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/);
  if (norwegian) {
    const day = norwegian[1].padStart(2, "0");
    const month = norwegian[2].padStart(2, "0");
    return `${norwegian[3]}-${month}-${day}`;
  }

  return null;
}

function cleanValue(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/[.;,]$/, "");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function compactSourceText(value: string): string {
  return normalizeWhitespace(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join("\n");
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) =>
      /^[A-Z0-9]+$/.test(part)
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    .join(" ");
}
