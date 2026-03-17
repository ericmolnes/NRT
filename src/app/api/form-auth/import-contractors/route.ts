import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Ingen fil lastet opp" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer as ArrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return NextResponse.json({ error: "Ingen ark funnet i filen" }, { status: 400 });
  }

  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    // Skip header row if it looks like a header
    const firstCell = String(row.getCell(1).value ?? "").trim();
    if (rowNumber === 1 && /^(fornavn|first|navn)/i.test(firstCell)) {
      return;
    }

    const firstName = String(row.getCell(1).value ?? "").trim();
    const lastName = String(row.getCell(2).value ?? "").trim();

    if (!firstName || !lastName) {
      if (firstName || lastName) {
        errors.push(`Rad ${rowNumber}: Mangler ${!firstName ? "fornavn" : "etternavn"}`);
      }
      return;
    }

    created.push(`${firstName} ${lastName}`);
  });

  // Create personnel records
  let createdCount = 0;
  for (const name of created) {
    // Check for duplicate
    const existing = await db.personnel.findFirst({
      where: { name, status: "ACTIVE" },
    });

    if (existing) {
      skipped.push(name);
      continue;
    }

    await db.personnel.create({
      data: {
        name,
        role: "Innleid",
        status: "ACTIVE",
      },
    });
    createdCount++;
  }

  return NextResponse.json({
    success: true,
    created: createdCount,
    skipped: skipped.length,
    errors,
    details: {
      createdNames: created.filter((n) => !skipped.includes(n)),
      skippedNames: skipped,
    },
  });
}
