import { auth } from "@/lib/auth";
import { getResourcePlanGrid, getResourcePlanLabels } from "@/lib/queries/resource-plan";
import { getDateRange, formatDate, getWeekNumber } from "@/lib/resource-plan-utils";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

/** Konverter hex (#rrggbb) til ARGB (FFrrggbb) for ExcelJS */
function hexToArgb(hex: string): string {
  return "FF" + hex.replace("#", "");
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const planId = params.get("planId");
  const yearStr = params.get("year");

  if (!planId || !yearStr) {
    return NextResponse.json({ error: "planId og year er påkrevd" }, { status: 400 });
  }

  const year = parseInt(yearStr);
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const [entries, labels] = await Promise.all([
    getResourcePlanGrid(planId, startDate, endDate),
    getResourcePlanLabels(planId),
  ]);

  // Bygg fargekart
  const labelMap = new Map<string, { color: string; textColor: string }>();
  for (const label of labels) {
    labelMap.set(label.name, { color: label.color, textColor: label.textColor });
  }

  const dates = getDateRange(startDate, endDate);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Ressursplan ${year}`);
  ws.views = [{ state: "frozen", xSplit: 4, ySplit: 3 }];

  // Header rad 1: Måneder
  const monthRow = ws.getRow(1);
  monthRow.getCell(1).value = "Ressursplan";
  monthRow.getCell(1).font = { bold: true, size: 12 };

  let colIndex = 5;
  let currentMonth = -1;
  let monthStartCol = 5;
  for (const d of dates) {
    const month = d.getMonth();
    if (month !== currentMonth) {
      if (currentMonth >= 0) ws.mergeCells(1, monthStartCol, 1, colIndex - 1);
      currentMonth = month;
      monthStartCol = colIndex;
      monthRow.getCell(colIndex).value = d.toLocaleDateString("nb-NO", { month: "long" });
      monthRow.getCell(colIndex).font = { bold: true };
      monthRow.getCell(colIndex).alignment = { horizontal: "center" };
    }
    colIndex++;
  }
  if (monthStartCol < colIndex) ws.mergeCells(1, monthStartCol, 1, colIndex - 1);

  // Header rad 2: Ukenumre
  const weekRow = ws.getRow(2);
  colIndex = 5;
  let currentWeek = -1;
  let weekStartCol = 5;
  for (const d of dates) {
    const week = getWeekNumber(d);
    if (week !== currentWeek) {
      if (currentWeek >= 0) ws.mergeCells(2, weekStartCol, 2, colIndex - 1);
      currentWeek = week;
      weekStartCol = colIndex;
      weekRow.getCell(colIndex).value = `Uke ${week}`;
      weekRow.getCell(colIndex).font = { size: 8 };
      weekRow.getCell(colIndex).alignment = { horizontal: "center" };
    }
    colIndex++;
  }
  if (weekStartCol < colIndex) ws.mergeCells(2, weekStartCol, 2, colIndex - 1);

  // Header rad 3
  const headerRow = ws.getRow(3);
  headerRow.getCell(1).value = "Navn";
  headerRow.getCell(2).value = "Crew";
  headerRow.getCell(3).value = "Selskap";
  headerRow.getCell(4).value = "Lokasjon";
  headerRow.font = { bold: true, size: 9 };

  const dayNames = ["son", "man", "tir", "ons", "tor", "fre", "lor"];
  colIndex = 5;
  for (const d of dates) {
    const cell = headerRow.getCell(colIndex);
    cell.value = `${dayNames[d.getDay()]} ${d.getDate()}`;
    cell.font = { size: 7 };
    cell.alignment = { horizontal: "center" };
    if (d.getDay() === 0 || d.getDay() === 6) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
    }
    colIndex++;
  }

  ws.getColumn(1).width = 25;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 14;
  for (let c = 5; c < 5 + dates.length; c++) ws.getColumn(c).width = 5;

  // Data-rader
  let rowIndex = 4;
  for (const entry of entries) {
    const row = ws.getRow(rowIndex);
    row.getCell(1).value = entry.displayName;
    row.getCell(2).value = entry.crew;
    row.getCell(3).value = entry.company;
    row.getCell(4).value = entry.location;
    row.font = { size: 9 };

    const allocMap = new Map<string, string>();
    for (const alloc of entry.allocations) {
      const s = new Date(alloc.startDate);
      const e = new Date(alloc.endDate);
      const cursor = new Date(s);
      while (cursor <= e) {
        allocMap.set(formatDate(cursor), alloc.label);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    colIndex = 5;
    for (const d of dates) {
      const dateStr = formatDate(d);
      const label = allocMap.get(dateStr);
      const cell = row.getCell(colIndex);

      if (label) {
        const style = labelMap.get(label);
        cell.value = label;
        cell.font = { size: 7, color: { argb: style ? hexToArgb(style.textColor) : "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: style ? hexToArgb(style.color) : "FF9CA3AF" },
        };
        cell.alignment = { horizontal: "center" };
      } else if (d.getDay() === 0 || d.getDay() === 6) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      }
      colIndex++;
    }

    rowIndex++;
  }

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Ressursplan_${year}.xlsx"`,
    },
  });
}
