import { db } from "@/lib/db";
import { equipmentTypeToNormName } from "./cable-classifier";

type EstimateWithRelations = Awaited<ReturnType<typeof getFullEstimate>>;

async function getFullEstimate(estimateId: string) {
  return db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    include: {
      cables: true,
      equipment: true,
      scopeItems: true,
      lineItems: true,
      rateProfile: { include: { rates: true } },
    },
  });
}

interface LaborBreakdown {
  discipline: string;
  roleCode: string;
  totalHours: number;
  hourlyRate: number;
  totalCost: number;
}

/**
 * Beregner totaler for et estimat basert pa normer, rater og materialer.
 * Tilkomstfaktor (adjustmentFactor) multipliseres pa alle timer.
 * Formel per linje: totalTimer = antall * timerPerEnhet * tilkomstfaktor
 */
export async function recalculateEstimate(estimateId: string) {
  const estimate = await getFullEstimate(estimateId);

  // Hent alle normer
  const normCategories = await db.normCategory.findMany({
    include: { norms: true },
  });

  const normsByName = new Map<string, { hoursPerUnit: number }>();
  const normsBySizeAndCategory = new Map<string, { hoursPerUnit: number }>();

  for (const cat of normCategories) {
    for (const norm of cat.norms) {
      normsByName.set(norm.name, { hoursPerUnit: norm.hoursPerUnit });
      if (norm.sizeRange) {
        normsBySizeAndCategory.set(`${cat.name}|${norm.sizeRange}`, {
          hoursPerUnit: norm.hoursPerUnit,
        });
      }
    }
  }

  // ─── Beregn kabeltimer ────────────────────────────────────────────
  let cableHours = 0;
  for (const cable of estimate.cables) {
    const sizeCategory = cable.sizeCategory || "< 6mm2";
    const norm =
      normsBySizeAndCategory.get(`Kabelinstallasjon|${sizeCategory}`) ||
      normsBySizeAndCategory.get(`Kabelinstallasjon|< 6mm2`);

    if (norm) {
      const factor = cable.adjustmentFactor ?? 1.0;
      cableHours += cable.lengthMeters * norm.hoursPerUnit * factor;
    }
  }

  // ─── Beregn utstyrstimer ─────────────────────────────────────────
  let equipmentHours = 0;
  for (const equip of estimate.equipment) {
    const normName = equipmentTypeToNormName(equip.type, equip.action);
    if (normName) {
      const norm = normsByName.get(normName);
      if (norm) {
        const factor = equip.adjustmentFactor ?? 1.0;
        equipmentHours += equip.quantity * norm.hoursPerUnit * factor;
      }
    }
  }

  // ─── Beregn omfangstimer ─────────────────────────────────────────
  let scopeHours = 0;
  const scopeUpdates: { id: string; totalHours: number }[] = [];

  for (const item of estimate.scopeItems) {
    let itemHours = item.totalHours || 0;
    const factor = item.adjustmentFactor ?? 1.0;

    if (item.hoursPerUnit) {
      itemHours = item.quantity * item.hoursPerUnit * factor;
      scopeUpdates.push({ id: item.id, totalHours: itemHours });
    } else if (item.normId) {
      const norm = await db.workNorm.findUnique({
        where: { id: item.normId },
      });
      if (norm) {
        itemHours = item.quantity * norm.hoursPerUnit * factor;
        scopeUpdates.push({ id: item.id, totalHours: itemHours });
      }
    }

    scopeHours += itemHours;
  }

  // Oppdater scopeItems med beregnede timer
  for (const update of scopeUpdates) {
    await db.estimateScopeItem.update({
      where: { id: update.id },
      data: { totalHours: update.totalHours },
    });
  }

  // ─── Totale timer ────────────────────────────────────────────────
  const totalLaborHours = cableHours + equipmentHours + scopeHours;

  // ─── Beregn materialkostnad ──────────────────────────────────────
  let totalMaterialCost = 0;
  for (const item of estimate.lineItems) {
    totalMaterialCost += item.totalPriceNOK || 0;
  }

  const materialWithMarkup =
    totalMaterialCost * (1 + (estimate.markupPercent || 0) / 100);

  // ─── Beregn arbeidskostnad per disiplin ──────────────────────────
  const laborBreakdown: LaborBreakdown[] = [];

  if (estimate.rateProfile) {
    const rates = estimate.rateProfile.rates;
    const electricianRate =
      rates.find((r) => r.roleCode === "ELECTRICIAN")?.hourlyRateNOK || 790;
    const engineerRate =
      rates.find((r) => r.roleCode === "ENGINEER")?.hourlyRateNOK || 900;
    const fieldEngineerRate =
      rates.find((r) => r.roleCode === "FIELD_ENGINEER")?.hourlyRateNOK || 990;

    // Elektro-timer (kabler + utstyr)
    const electricalHours = cableHours + equipmentHours;
    if (electricalHours > 0) {
      laborBreakdown.push({
        discipline: "ELECTRICAL",
        roleCode: "ELECTRICIAN",
        totalHours: electricalHours,
        hourlyRate: electricianRate,
        totalCost: electricalHours * electricianRate,
      });

      // Feltingenior - konfigurerbar prosent (standard 15%)
      const fieldEngPercent = (estimate.fieldEngineerPercent ?? 15) / 100;
      const fieldEngHours = electricalHours * fieldEngPercent;
      if (fieldEngHours > 0) {
        laborBreakdown.push({
          discipline: "ELECTRICAL",
          roleCode: "FIELD_ENGINEER",
          totalHours: Math.round(fieldEngHours * 10) / 10,
          hourlyRate: fieldEngineerRate,
          totalCost: fieldEngHours * fieldEngineerRate,
        });
      }
    }

    // Engineering-timer
    const engineeringHours = estimate.scopeItems
      .filter((s) => s.discipline === "ENGINEERING")
      .reduce((sum, s) => sum + (s.totalHours || 0), 0);

    if (engineeringHours > 0) {
      laborBreakdown.push({
        discipline: "ENGINEERING",
        roleCode: "ENGINEER",
        totalHours: engineeringHours,
        hourlyRate: engineerRate,
        totalCost: engineeringHours * engineerRate,
      });
    }

    // Instrument-timer
    const instrumentHours = estimate.scopeItems
      .filter((s) => s.discipline === "INSTRUMENT")
      .reduce((sum, s) => sum + (s.totalHours || 0), 0);

    if (instrumentHours > 0) {
      laborBreakdown.push({
        discipline: "INSTRUMENT",
        roleCode: "ELECTRICIAN",
        totalHours: instrumentHours,
        hourlyRate: electricianRate,
        totalCost: instrumentHours * electricianRate,
      });
    }
  }

  const totalLaborCost = laborBreakdown.reduce(
    (sum, lb) => sum + lb.totalCost,
    0
  );

  // ─── Nye kostnadsposter ────────────────────────────────────────
  const contingency =
    (totalLaborCost + materialWithMarkup) *
    ((estimate.contingencyPercent ?? 0) / 100);
  const mobDemob = estimate.mobDemobCost ?? 0;
  const equipmentRental = estimate.equipmentRentalCost ?? 0;
  const totalCost =
    totalLaborCost + materialWithMarkup + contingency + mobDemob + equipmentRental;

  // ─── Slett gamle labor summary og opprett nye ────────────────────
  await db.estimateLaborSummary.deleteMany({
    where: { estimateId },
  });

  if (laborBreakdown.length > 0) {
    await db.estimateLaborSummary.createMany({
      data: laborBreakdown.map((lb) => ({
        estimateId,
        discipline: lb.discipline as "ELECTRICAL" | "INSTRUMENT" | "ENGINEERING",
        roleCode: lb.roleCode,
        totalHours: lb.totalHours,
        hourlyRate: lb.hourlyRate,
        totalCost: lb.totalCost,
      })),
    });
  }

  // ─── Oppdater estimat-totaler ────────────────────────────────────
  await db.estimate.update({
    where: { id: estimateId },
    data: {
      totalLaborHours: Math.round(totalLaborHours * 10) / 10,
      totalLaborCost: Math.round(totalLaborCost),
      totalMaterialCost: Math.round(materialWithMarkup),
      totalCost: Math.round(totalCost),
    },
  });

  return {
    totalLaborHours,
    totalLaborCost,
    totalMaterialCost: materialWithMarkup,
    contingency,
    mobDemob,
    equipmentRental,
    totalCost,
    laborBreakdown,
  };
}
