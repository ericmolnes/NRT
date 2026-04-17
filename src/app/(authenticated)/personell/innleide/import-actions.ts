"use server";

import { auth } from "@/lib/auth";
import { assertAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getRateLimitStatus } from "@/lib/recman/rate-limiter";
import {
  matchCandidatesWithAI,
  type ParsedRow,
  type MatchEntry,
} from "@/lib/ai/match-candidates";
import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { createCandidateWithPersonnel } from "@/lib/personell/create-candidate";

// ─── Types ──────────────────────────────────────────────────────────

export type ImportDecision = {
  rowIndex: number;
  action: "create" | "merge" | "skip";
  matchedCandidateId?: string;
  rowData: {
    firstName: string;
    lastName: string;
    email?: string;
    mobilePhone?: string;
    phone?: string;
    title?: string;
    description?: string;
    address?: string;
    postalCode?: string;
    postalPlace?: string;
    city?: string;
    country?: string;
    nationality?: string;
    gender?: string;
    dob?: string;
    rating?: number;
    isContractor?: boolean;
    company?: string;
    linkedIn?: string;
    skills?: string[];
    courses?: string[];
    driversLicense?: string[];
    languages?: string[];
  };
};

// ─── Column mapping ─────────────────────────────────────────────────

const HEADER_MAP: Record<string, string> = {
  fornavn: "firstName",
  etternavn: "lastName",
  "e-post": "email",
  epost: "email",
  mobiltelefon: "mobilePhone",
  mobil: "mobilePhone",
  telefon: "phone",
  "tittel/stilling": "title",
  tittel: "title",
  stilling: "title",
  beskrivelse: "description",
  adresse: "address",
  postnummer: "postalCode",
  poststed: "postalPlace",
  by: "city",
  land: "country",
  nasjonalitet: "nationality",
  "kjønn": "gender",
  kjonn: "gender",
  "fødselsdato": "dob",
  fodselsdato: "dob",
  rating: "rating",
  innleid: "isContractor",
  bedrift: "company",
  "leid inn til": "company",
  "innleid til": "company",
  linkedin: "linkedIn",
  kompetanser: "skills",
  "kurs/sertifiseringer": "courses",
  kurs: "courses",
  sertifiseringer: "courses",
  "førerkort": "driversLicense",
  forerkort: "driversLicense",
  "språk": "languages",
  sprak: "languages",
};

function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s*\*\s*$/, "") // Strip trailing * (e.g. "Fornavn *" → "fornavn")
    .replace(/\s+/g, " ")
    .trim();
}

function splitCommaSeparated(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Extract plain text from an ExcelJS cell value (handles richText, formulas, etc.) */
function getCellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  // ExcelJS richText: { richText: [{text: "..."}] }
  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((r: { text?: string }) => r.text || "").join("");
  }
  // ExcelJS formula result: { result: "...", formula: "..." }
  if (typeof value === "object" && "result" in value) {
    return getCellText((value as { result: ExcelJS.CellValue }).result);
  }
  // ExcelJS hyperlink: { text: "...", hyperlink: "..." }
  if (typeof value === "object" && "text" in value) {
    return String((value as { text: string }).text);
  }
  return String(value);
}

/** Validates and parses a date string, returning null for invalid dates */
function safeParseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

/** Simple email format check */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Parse Excel file ───────────────────────────────────────────────

export async function parseExcelFile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");
  await assertAdmin();

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false as const, rows: [] as ParsedRow[], errors: ["Ingen fil valgt"] };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return { success: false as const, rows: [] as ParsedRow[], errors: ["Ingen ark funnet i filen"] };
    }

    // Read header row
    const headerRow = sheet.getRow(1);
    const columnMap = new Map<number, string>();
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const raw = getCellText(cell.value).trim();
      if (!raw) return;
      const normalized = normalizeHeader(raw);
      const mapped = HEADER_MAP[normalized];
      if (mapped) {
        columnMap.set(colNumber, mapped);
      }
    });

    if (columnMap.size === 0) {
      return {
        success: false as const,
        rows: [] as ParsedRow[],
        errors: ["Kunne ikke gjenkjenne kolonneoverskrifter. Forventet: Fornavn, Etternavn, etc."],
      };
    }

    const rows: ParsedRow[] = [];
    const errors: string[] = [];

    // Parse data rows (starting from row 2)
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= 1) return; // Skip header

      // Check if this looks like a repeated header row
      const firstCellText = getCellText(row.getCell(1).value).trim().toLowerCase();
      if (firstCellText === "fornavn") return;

      const record: Record<string, unknown> = {};
      let hasData = false;

      columnMap.forEach((fieldName, colNumber) => {
        const text = getCellText(row.getCell(colNumber).value).trim();
        if (text !== "") {
          hasData = true;
          record[fieldName] = text;
        }
      });

      if (!hasData) return; // Skip empty rows

      const firstName = String(record.firstName ?? "").trim();
      const lastName = String(record.lastName ?? "").trim();

      if (!firstName && !lastName) {
        errors.push(`Rad ${rowNumber}: Mangler fornavn og etternavn`);
        return;
      }

      // Parse special fields
      const isContractorRaw = String(record.isContractor ?? "").toLowerCase();
      const isContractor = isContractorRaw === "ja" || isContractorRaw === "yes" || isContractorRaw === "true" || isContractorRaw === "1";

      const ratingRaw = record.rating ? parseInt(String(record.rating), 10) : undefined;
      const rating = ratingRaw !== undefined && !isNaN(ratingRaw) && ratingRaw >= 0 && ratingRaw <= 5 ? ratingRaw : undefined;

      // Validate email if provided
      const emailRaw = record.email ? String(record.email) : undefined;
      const email = emailRaw && isValidEmail(emailRaw) ? emailRaw : undefined;
      if (emailRaw && !isValidEmail(emailRaw)) {
        errors.push(`Rad ${rowNumber}: Ugyldig e-postformat "${emailRaw}"`);
      }

      rows.push({
        rowIndex: rowNumber,
        firstName,
        lastName,
        email,
        phone: record.phone ? String(record.phone) : undefined,
        mobilePhone: record.mobilePhone ? String(record.mobilePhone) : undefined,
        title: record.title ? String(record.title) : undefined,
        description: record.description ? String(record.description) : undefined,
        address: record.address ? String(record.address) : undefined,
        postalCode: record.postalCode ? String(record.postalCode) : undefined,
        postalPlace: record.postalPlace ? String(record.postalPlace) : undefined,
        city: record.city ? String(record.city) : undefined,
        country: record.country ? String(record.country) : undefined,
        nationality: record.nationality ? String(record.nationality) : undefined,
        gender: record.gender ? String(record.gender) : undefined,
        dob: record.dob ? String(record.dob) : undefined,
        rating,
        isContractor,
        company: record.company ? String(record.company) : undefined,
        linkedIn: record.linkedIn ? String(record.linkedIn) : undefined,
        skills: splitCommaSeparated(record.skills as string),
        courses: splitCommaSeparated(record.courses as string),
        driversLicense: splitCommaSeparated(record.driversLicense as string),
        languages: splitCommaSeparated(record.languages as string),
      } as ParsedRow);
    });

    return { success: true as const, rows, errors, fileName: file.name };
  } catch (err) {
    console.error("[import-actions] parseExcelFile error:", err);
    return {
      success: false as const,
      rows: [] as ParsedRow[],
      errors: ["Kunne ikke lese filen. Kontroller at det er en gyldig Excel-fil (.xlsx)."],
    };
  }
}

// ─── AI Matching ────────────────────────────────────────────────────

export async function runAIMatching(rows: ParsedRow[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");
  await assertAdmin();

  try {
    // Get existing candidates (limited to prevent OOM)
    const existingCandidates = await db.recmanCandidate.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        isEmployee: true,
        isContractor: true,
      },
      take: 10000,
    });

    const matches = await matchCandidatesWithAI(rows, existingCandidates);
    const rateLimitStatus = await getRateLimitStatus();

    return {
      success: true as const,
      matches: matches.matches,
      rateLimitStatus,
    };
  } catch (err) {
    console.error("[import-actions] runAIMatching error:", err);
    const rateLimitStatus = await getRateLimitStatus().catch(() => ({ count: 0, limit: 200, remaining: 200 }));
    return {
      success: false as const,
      matches: [] as MatchEntry[],
      rateLimitStatus,
      aiError: err instanceof Error ? err.message : "AI-matching feilet — kontroller resultater manuelt",
    };
  }
}

// ─── Execute import ─────────────────────────────────────────────────

export async function executeImport(decisions: ImportDecision[], fileName?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");
  await assertAdmin();

  let created = 0;
  let merged = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  // Log the batch
  const batch = await db.candidateImportBatch.create({
    data: {
      status: "PROCESSING",
      fileName: fileName || "excel-import",
      totalRows: decisions.length,
      createdById: session.user.id,
    },
  });

  for (const decision of decisions) {
    try {
      if (decision.action === "skip") {
        skipped++;
        continue;
      }

      if (decision.action === "create") {
        await handleCreate(decision);
        created++;
      } else if (decision.action === "merge") {
        await handleMerge(decision);
        merged++;
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : "Ukjent feil";
      errors.push(`Rad ${decision.rowIndex}: ${msg}`);
      console.error(`[import-actions] row ${decision.rowIndex} failed:`, err);
    }
  }

  // Determine accurate batch status
  const status = failed === decisions.length
    ? "FAILED"
    : failed > 0
      ? "COMPLETED" // partial success
      : "COMPLETED";

  // Update batch record (truncate error log if too long)
  const errorLog = errors.length > 0 ? errors.slice(0, 100).join("\n") : null;
  await db.candidateImportBatch.update({
    where: { id: batch.id },
    data: {
      status,
      createdRows: created,
      matchedRows: merged,
      failedRows: failed,
      errorLog,
      completedAt: new Date(),
    },
  });

  revalidatePath("/personell/innleide");
  revalidatePath("/personell/kandidater");
  revalidatePath("/personell");

  return { success: true as const, created, merged, skipped, failed, errors };
}

// ─── Merge helpers ──────────────────────────────────────────────────

/** Merge {name} arrays: add new entries not already present (case-insensitive) */
function mergeNamedArray(
  target: Record<string, unknown>,
  key: string,
  existing: unknown,
  incoming: string[] | undefined
) {
  const arr = (Array.isArray(existing) ? existing : []) as Array<{ name: string }>;
  const seen = new Set(arr.map((s) => s.name?.toLowerCase()).filter(Boolean));
  const fresh = (incoming || [])
    .filter((s) => !seen.has(s.toLowerCase()))
    .map((name) => ({ name }));
  if (fresh.length > 0) target[key] = [...arr, ...fresh];
}

/** Merge plain string arrays (case-insensitive dedup) */
function mergeStringArray(
  target: Record<string, unknown>,
  key: string,
  existing: unknown,
  incoming: string[] | undefined
) {
  const arr = (Array.isArray(existing) ? existing : []) as string[];
  const seen = new Set(arr.map((s) => s.toLowerCase()));
  const fresh = (incoming || []).filter((s) => !seen.has(s.toLowerCase()));
  if (fresh.length > 0) target[key] = [...arr, ...fresh];
}

async function handleCreate(decision: ImportDecision) {
  const { rowData } = decision;
  const id = await createCandidateWithPersonnel(rowData);
  console.log(`[import] created local candidate ${id} (${rowData.firstName} ${rowData.lastName})`);
}

// ─── Merge with existing candidate ──────────────────────────────────

async function handleMerge(decision: ImportDecision) {
  const { rowData, matchedCandidateId } = decision;

  if (!matchedCandidateId) {
    throw new Error("Ingen matchet kandidat-ID for sammenslåing");
  }

  const existing = await db.recmanCandidate.findUnique({
    where: { id: matchedCandidateId },
    include: {
      contractorPeriods: {
        where: { endDate: null },
        take: 1,
      },
    },
  });

  if (!existing) {
    throw new Error(`Kandidat ${matchedCandidateId} ikke funnet`);
  }

  // Build update: only overwrite null/empty fields
  const updateData: Record<string, unknown> = {};

  if (!existing.email && rowData.email) updateData.email = rowData.email;
  if (!existing.phone && rowData.phone) updateData.phone = rowData.phone;
  if (!existing.mobilePhone && rowData.mobilePhone) updateData.mobilePhone = rowData.mobilePhone;
  if (!existing.title && rowData.title) updateData.title = rowData.title;
  if (!existing.description && rowData.description) updateData.description = rowData.description;
  if (!existing.address && rowData.address) updateData.address = rowData.address;
  if (!existing.postalCode && rowData.postalCode) updateData.postalCode = rowData.postalCode;
  if (!existing.postalPlace && rowData.postalPlace) updateData.postalPlace = rowData.postalPlace;
  if (!existing.city && rowData.city) updateData.city = rowData.city;
  if (!existing.country && rowData.country) updateData.country = rowData.country;
  if (!existing.nationality && rowData.nationality) updateData.nationality = rowData.nationality;
  if (!existing.gender && rowData.gender) updateData.gender = rowData.gender;
  if (!existing.dob && rowData.dob) {
    const parsed = safeParseDate(rowData.dob);
    if (parsed) updateData.dob = parsed;
  }
  if (!existing.linkedIn && rowData.linkedIn) updateData.linkedIn = rowData.linkedIn;
  if (existing.rating === 0 && rowData.rating) updateData.rating = rowData.rating;

  // Merge array fields: add new entries not already present
  mergeNamedArray(updateData, "skills", existing.skills, rowData.skills);
  mergeNamedArray(updateData, "courses", existing.courses, rowData.courses);
  mergeNamedArray(updateData, "languages", existing.languages, rowData.languages);
  mergeStringArray(updateData, "driversLicense", existing.driversLicense, rowData.driversLicense);

  // Set contractor status if needed
  if (rowData.isContractor && !existing.isContractor) {
    updateData.isContractor = true;
  }

  // Update local DB if there's anything to update
  if (Object.keys(updateData).length > 0) {
    await db.recmanCandidate.update({
      where: { id: matchedCandidateId },
      data: updateData,
    });
  }

  // If contractor: create period + personnel if not already set
  if (rowData.isContractor && !existing.isContractor) {
    await db.$transaction(async (tx) => {
      if (existing.contractorPeriods.length === 0) {
        await tx.contractorPeriod.create({
          data: {
            recmanCandidateId: matchedCandidateId,
            startDate: new Date(),
            company: rowData.company || null,
          },
        });
      }

      if (existing.personnelId) {
        await tx.personnel.update({
          where: { id: existing.personnelId },
          data: { status: "ACTIVE", role: "Innleid" },
        });
      } else {
        const personnel = await tx.personnel.create({
          data: {
            name: `${existing.firstName} ${existing.lastName}`,
            email: existing.email || rowData.email || null,
            role: "Innleid",
            status: "ACTIVE",
          },
        });

        await tx.recmanCandidate.update({
          where: { id: matchedCandidateId },
          data: { personnelId: personnel.id },
        });
      }
    });
  }

  console.log(`[import] merged data into candidate ${matchedCandidateId}`);
}
