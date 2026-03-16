/**
 * Importskript for å lese Excel-ressursplanen og fylle databasen.
 *
 * Kjøres med: npx tsx prisma/seed-resource-plan.ts
 */

import ExcelJS from "exceljs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const EXCEL_PATH = path.resolve(
  __dirname,
  "../fra meg/Ressursplan/Resursplan – 2026 ny.xlsx"
);

const SHEET_NAME = "Resursplan2026";

// Kolonneindekser (1-basert som i Excel)
const COL_NOTES = 1;    // A
const COL_CREW = 2;     // B
const COL_LOCATION = 3; // C
const COL_COMPANY = 4;  // D
const COL_NAME = 6;     // F (fullt navn)
const COL_DATE_START = 7; // G (første datokolonne)
const ROW_DATES = 7;     // Rad 7 har datoer
const ROW_DATA_START = 9; // Data starter fra rad 9

// Standard-labels med farger (opprettes dynamisk)
const DEFAULT_LABELS: { name: string; color: string; textColor: string; category: string }[] = [
  { name: "Aker", color: "#22c55e", textColor: "#ffffff", category: "client" },
  { name: "Westcon", color: "#14b8a6", textColor: "#ffffff", category: "client" },
  { name: "CCB", color: "#f97316", textColor: "#ffffff", category: "client" },
  { name: "Odfjell", color: "#6366f1", textColor: "#ffffff", category: "client" },
  { name: "Archer", color: "#0284c7", textColor: "#ffffff", category: "client" },
  { name: "Wood", color: "#92400e", textColor: "#ffffff", category: "client" },
  { name: "Semco", color: "#e11d48", textColor: "#ffffff", category: "client" },
  { name: "RIS", color: "#7c3aed", textColor: "#ffffff", category: "client" },
  { name: "Floatel Superior", color: "#06b6d4", textColor: "#ffffff", category: "client" },
  { name: "NRT", color: "#10b981", textColor: "#ffffff", category: "internal" },
  { name: "Ferie", color: "#facc15", textColor: "#422006", category: "status" },
  { name: "Kurs", color: "#60a5fa", textColor: "#ffffff", category: "status" },
  { name: "Skole", color: "#c084fc", textColor: "#ffffff", category: "status" },
  { name: "Utilgjengelig", color: "#f87171", textColor: "#ffffff", category: "status" },
  { name: "Medarbeider samtale", color: "#fb923c", textColor: "#ffffff", category: "status" },
  { name: "Tilgjengelig", color: "#a3e635", textColor: "#1a2e05", category: "status" },
];

/** Normaliser celleverdien til et label-navn */
function normalizeLabel(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  // Ignorer numeriske verdier (rotasjonsmarkører)
  if (/^\d+$/.test(v)) return null;
  // Normaliser case for kjente verdier
  const lower = v.toLowerCase();
  for (const label of DEFAULT_LABELS) {
    if (label.name.toLowerCase() === lower) return label.name;
  }
  // Ukjent verdi - returner som den er (ny label opprettes)
  return v;
}

async function main() {
  console.log("Leser Excel-fil:", EXCEL_PATH);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  const ws = wb.getWorksheet(SHEET_NAME);
  if (!ws) {
    throw new Error(`Fant ikke ark "${SHEET_NAME}"`);
  }

  console.log(`Ark: ${SHEET_NAME}, rader: ${ws.rowCount}, kolonner: ${ws.columnCount}`);

  // Les datoer fra rad 7
  const dateRow = ws.getRow(ROW_DATES);
  const dates: Map<number, Date> = new Map();
  for (let col = COL_DATE_START; col <= ws.columnCount; col++) {
    const cell = dateRow.getCell(col);
    if (cell.value instanceof Date) {
      dates.set(col, cell.value);
    }
  }
  console.log(`Fant ${dates.size} datokolonner`);

  // Opprett eller hent ressursplan
  const year = 2026;
  let plan = await prisma.resourcePlan.findUnique({ where: { year } });
  if (!plan) {
    plan = await prisma.resourcePlan.create({
      data: {
        year,
        name: `Ressursplan ${year}`,
        createdById: "import",
        createdBy: "Excel Import",
      },
    });
    console.log("Opprettet ressursplan:", plan.id);
  } else {
    // Slett eksisterende entries for re-import
    await prisma.resourcePlanEntry.deleteMany({
      where: { resourcePlanId: plan.id },
    });
    await prisma.resourcePlanLabel.deleteMany({
      where: { resourcePlanId: plan.id },
    });
    console.log("Slettet eksisterende data for re-import");
  }

  // Opprett standard-labels
  for (let i = 0; i < DEFAULT_LABELS.length; i++) {
    const label = DEFAULT_LABELS[i];
    await prisma.resourcePlanLabel.create({
      data: {
        resourcePlanId: plan.id,
        name: label.name,
        color: label.color,
        textColor: label.textColor,
        category: label.category,
        sortOrder: i,
      },
    });
  }
  console.log(`Opprettet ${DEFAULT_LABELS.length} standard-labels`);

  // Track nye labels som dukker opp fra Excel
  const knownLabels = new Set(DEFAULT_LABELS.map((l) => l.name));
  let nextSortOrder = DEFAULT_LABELS.length;

  // Hent eksisterende personell for kobling
  const allPersonnel = await prisma.personnel.findMany({
    select: { id: true, name: true },
  });
  const personnelMap = new Map<string, string>();
  for (const p of allPersonnel) {
    personnelMap.set(p.name.toLowerCase(), p.id);
  }
  console.log(`Fant ${allPersonnel.length} personell-oppføringer for kobling`);

  // Les rader
  let entryCount = 0;
  let allocationCount = 0;

  for (let row = ROW_DATA_START; row <= ws.rowCount; row++) {
    const wsRow = ws.getRow(row);
    const name = getCellString(wsRow.getCell(COL_NAME));

    if (!name || name === "Innleid" || name === "Terminert") continue;
    const crew = getCellString(wsRow.getCell(COL_CREW));
    if (!crew && row > 185) continue;

    const location = getCellString(wsRow.getCell(COL_LOCATION));
    const company = getCellString(wsRow.getCell(COL_COMPANY));
    const notes = getCellString(wsRow.getCell(COL_NOTES));
    const personnelId = personnelMap.get(name.toLowerCase()) ?? null;

    const entry = await prisma.resourcePlanEntry.create({
      data: {
        resourcePlanId: plan.id,
        personnelId,
        displayName: name,
        crew: crew || null,
        location: location || null,
        company: company || null,
        notes: notes || null,
        sortOrder: entryCount,
      },
    });
    entryCount++;

    // Les allokeringer
    let currentAlloc: { label: string; startDate: Date; endDate: Date } | null = null;
    const sortedCols = Array.from(dates.entries()).sort(([a], [b]) => a - b);

    for (const [col, date] of sortedCols) {
      const cellValue = getCellString(wsRow.getCell(col));
      const label = cellValue ? normalizeLabel(cellValue) : null;

      if (label) {
        // Opprett ny label on-the-fly hvis den ikke finnes
        if (!knownLabels.has(label)) {
          await prisma.resourcePlanLabel.create({
            data: {
              resourcePlanId: plan.id,
              name: label,
              color: generateColor(nextSortOrder),
              textColor: "#ffffff",
              category: "client",
              sortOrder: nextSortOrder++,
            },
          });
          knownLabels.add(label);
          console.log(`  Ny label oppdaget: "${label}"`);
        }

        if (currentAlloc && currentAlloc.label === label) {
          currentAlloc.endDate = date;
        } else {
          if (currentAlloc) {
            await prisma.resourceAllocation.create({
              data: {
                entryId: entry.id,
                startDate: currentAlloc.startDate,
                endDate: currentAlloc.endDate,
                label: currentAlloc.label,
              },
            });
            allocationCount++;
          }
          currentAlloc = { label, startDate: date, endDate: date };
        }
      } else {
        if (currentAlloc) {
          await prisma.resourceAllocation.create({
            data: {
              entryId: entry.id,
              startDate: currentAlloc.startDate,
              endDate: currentAlloc.endDate,
              label: currentAlloc.label,
            },
          });
          allocationCount++;
          currentAlloc = null;
        }
      }
    }

    if (currentAlloc) {
      await prisma.resourceAllocation.create({
        data: {
          entryId: entry.id,
          startDate: currentAlloc.startDate,
          endDate: currentAlloc.endDate,
          label: currentAlloc.label,
        },
      });
      allocationCount++;
    }

    if (entryCount % 20 === 0) {
      console.log(`  ... ${entryCount} personer behandlet`);
    }
  }

  console.log(`\nImport fullført!`);
  console.log(`  ${entryCount} personer`);
  console.log(`  ${allocationCount} allokeringsperioder`);
  console.log(`  ${knownLabels.size} labels totalt`);

  await prisma.$disconnect();
}

function getCellString(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return value.toString();
  if (value instanceof Date) return "";
  if (typeof value === "object" && "text" in value) return String(value.text).trim();
  if (typeof value === "object" && "result" in value) {
    const result = (value as { result: unknown }).result;
    if (typeof result === "string") return result.trim();
    if (typeof result === "number") return result.toString();
  }
  return String(value).trim();
}

/** Generer en farge basert på indeks */
function generateColor(index: number): string {
  const hue = (index * 137.508) % 360; // Golden angle for god spredning
  return `hsl(${Math.round(hue)}, 65%, 50%)`;
}

main().catch((e) => {
  console.error("Import feilet:", e);
  process.exit(1);
});
