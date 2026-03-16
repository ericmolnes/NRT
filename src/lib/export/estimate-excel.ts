import ExcelJS from "exceljs";
import type { getEstimateById } from "@/lib/queries/estimates";

type FullEstimate = NonNullable<Awaited<ReturnType<typeof getEstimateById>>>;

const NOK = '#,##0" NOK"';
const DECIMAL = "#,##0.0";

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

/**
 * Genererer et Excel-dokument fra et estimat.
 * Returnerer en Buffer.
 */
export async function generateEstimateExcel(
  estimate: FullEstimate
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NRT Prisverktoy";
  workbook.created = new Date();

  // ─── Sammendrag ───────────────────────────────────────────────────
  const summary = workbook.addWorksheet("Sammendrag");
  summary.columns = [
    { header: "", key: "label", width: 30 },
    { header: "", key: "value", width: 25 },
  ];

  summary.addRow(["Estimat", estimate.name]);
  summary.addRow(["Prosjektnummer", estimate.projectNumber || "-"]);
  summary.addRow(["Status", estimate.status]);
  summary.addRow(["Opprettet av", estimate.createdByName]);
  summary.addRow([
    "Dato",
    new Date(estimate.createdAt).toLocaleDateString("nb-NO"),
  ]);
  summary.addRow([
    "Rateprofil",
    estimate.rateProfile?.name || "Ikke valgt",
  ]);
  summary.addRow([]);
  summary.addRow(["KOSTNADSSAMMENDRAG", ""]);
  const costHeaderRow = summary.lastRow!;
  costHeaderRow.font = { bold: true, size: 12 };

  summary.addRow(["Timer totalt", estimate.totalLaborHours]);
  summary.getCell(`B${summary.rowCount}`).numFmt = DECIMAL;

  summary.addRow(["Arbeidskostnad", estimate.totalLaborCost]);
  summary.getCell(`B${summary.rowCount}`).numFmt = NOK;

  summary.addRow(["Materialkostnad", estimate.totalMaterialCost]);
  summary.getCell(`B${summary.rowCount}`).numFmt = NOK;

  summary.addRow([`Paslag (${estimate.markupPercent}%)`, ""]);

  summary.addRow(["TOTALT", estimate.totalCost]);
  const totalRow = summary.lastRow!;
  totalRow.font = { bold: true, size: 14 };
  summary.getCell(`B${summary.rowCount}`).numFmt = NOK;

  // ─── Kabler ───────────────────────────────────────────────────────
  const cables = workbook.addWorksheet("Kabler");
  cables.columns = [
    { header: "Merke", key: "tag", width: 15 },
    { header: "Kabeltype", key: "type", width: 30 },
    { header: "Fra", key: "from", width: 20 },
    { header: "Til", key: "to", width: 20 },
    { header: "Lengde (m)", key: "length", width: 12 },
    { header: "Storrelse", key: "size", width: 12 },
    { header: "Verifisert", key: "verified", width: 10 },
  ];
  styleHeader(cables.getRow(1));

  for (const cable of estimate.cables) {
    cables.addRow({
      tag: cable.tagNumber || "",
      type: cable.cableType,
      from: cable.fromLocation || "",
      to: cable.toLocation || "",
      length: cable.lengthMeters,
      size: cable.sizeCategory || "",
      verified: cable.verified ? "Ja" : "Nei",
    });
  }

  // Totalrad
  cables.addRow({
    tag: "",
    type: "TOTALT",
    from: "",
    to: "",
    length: estimate.cables.reduce((s, c) => s + c.lengthMeters, 0),
    size: "",
    verified: "",
  });
  cables.lastRow!.font = { bold: true };

  // ─── Utstyr ───────────────────────────────────────────────────────
  const equip = workbook.addWorksheet("Utstyr");
  equip.columns = [
    { header: "Merke", key: "tag", width: 15 },
    { header: "Navn", key: "name", width: 30 },
    { header: "Type", key: "type", width: 18 },
    { header: "Aksjon", key: "action", width: 12 },
    { header: "Antall", key: "qty", width: 10 },
    { header: "Verifisert", key: "verified", width: 10 },
  ];
  styleHeader(equip.getRow(1));

  for (const item of estimate.equipment) {
    equip.addRow({
      tag: item.tagNumber || "",
      name: item.name,
      type: item.type,
      action: item.action,
      qty: item.quantity,
      verified: item.verified ? "Ja" : "Nei",
    });
  }

  // ─── Arbeidsomfang ────────────────────────────────────────────────
  const scope = workbook.addWorksheet("Arbeidsomfang");
  scope.columns = [
    { header: "Beskrivelse", key: "desc", width: 40 },
    { header: "Disiplin", key: "disc", width: 15 },
    { header: "Antall", key: "qty", width: 10 },
    { header: "Enhet", key: "unit", width: 10 },
    { header: "Timer/enhet", key: "hpu", width: 12 },
    { header: "Timer totalt", key: "total", width: 12 },
    { header: "Verifisert", key: "verified", width: 10 },
  ];
  styleHeader(scope.getRow(1));

  for (const item of estimate.scopeItems) {
    scope.addRow({
      desc: item.description,
      disc: item.discipline,
      qty: item.quantity,
      unit: item.unit,
      hpu: item.hoursPerUnit || "",
      total: item.totalHours || "",
      verified: item.verified ? "Ja" : "Nei",
    });
  }

  // Totalrad
  scope.addRow({
    desc: "TOTALT",
    disc: "",
    qty: "",
    unit: "",
    hpu: "",
    total: estimate.scopeItems.reduce(
      (s, i) => s + (i.totalHours || 0),
      0
    ),
    verified: "",
  });
  scope.lastRow!.font = { bold: true };

  // ─── Materialer ───────────────────────────────────────────────────
  const materials = workbook.addWorksheet("Materialer");
  materials.columns = [
    { header: "Produkt", key: "desc", width: 35 },
    { header: "Katalog-ID", key: "pid", width: 15 },
    { header: "Antall", key: "qty", width: 10 },
    { header: "Enhet", key: "unit", width: 10 },
    { header: "Enhetspris", key: "price", width: 15 },
    { header: "Total", key: "total", width: 15 },
    { header: "Verifisert", key: "verified", width: 10 },
  ];
  styleHeader(materials.getRow(1));

  for (const item of estimate.lineItems) {
    const row = materials.addRow({
      desc: item.description,
      pid: item.product?.productId || "",
      qty: item.quantity,
      unit: item.unit,
      price: item.unitPriceNOK || "",
      total: item.totalPriceNOK || "",
      verified: item.verified ? "Ja" : "Nei",
    });
    if (item.unitPriceNOK) row.getCell("price").numFmt = NOK;
    if (item.totalPriceNOK) row.getCell("total").numFmt = NOK;
  }

  // Totalrad
  const matTotal = estimate.lineItems.reduce(
    (s, i) => s + (i.totalPriceNOK || 0),
    0
  );
  const matRow = materials.addRow({
    desc: "TOTALT",
    pid: "",
    qty: "",
    unit: "",
    price: "",
    total: matTotal,
    verified: "",
  });
  matRow.font = { bold: true };
  matRow.getCell("total").numFmt = NOK;

  // ─── Timesammendrag ───────────────────────────────────────────────
  const labor = workbook.addWorksheet("Timesammendrag");
  labor.columns = [
    { header: "Disiplin", key: "disc", width: 18 },
    { header: "Rolle", key: "role", width: 25 },
    { header: "Timer", key: "hours", width: 12 },
    { header: "Timerate", key: "rate", width: 15 },
    { header: "Kostnad", key: "cost", width: 18 },
  ];
  styleHeader(labor.getRow(1));

  for (const row of estimate.laborSummary) {
    const r = labor.addRow({
      disc: row.discipline,
      role: row.roleCode,
      hours: row.totalHours,
      rate: row.hourlyRate,
      cost: row.totalCost,
    });
    r.getCell("rate").numFmt = NOK;
    r.getCell("cost").numFmt = NOK;
  }

  // Totalrad
  const laborTotal = estimate.laborSummary.reduce((s, r) => s + r.totalCost, 0);
  const laborTotalRow = labor.addRow({
    disc: "TOTALT",
    role: "",
    hours: estimate.totalLaborHours,
    rate: "",
    cost: laborTotal,
  });
  laborTotalRow.font = { bold: true };
  laborTotalRow.getCell("cost").numFmt = NOK;

  // ─── Forutsetninger ───────────────────────────────────────────────
  if (estimate.assumptions.length > 0) {
    const assumptions = workbook.addWorksheet("Forutsetninger");
    assumptions.columns = [
      { header: "Nokkkel", key: "key", width: 30 },
      { header: "Verdi", key: "value", width: 40 },
    ];
    styleHeader(assumptions.getRow(1));

    for (const a of estimate.assumptions) {
      assumptions.addRow({ key: a.key, value: a.value });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
