"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCanModify } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

// ─── Kabler ─────────────────────────────────────────────────────────

export async function updateCable(
  cableId: string,
  data: {
    tagNumber?: string;
    cableType?: string;
    fromLocation?: string;
    toLocation?: string;
    lengthMeters?: number;
    sizeCategory?: string;
    adjustmentFactor?: number;
    adjustmentNote?: string;
    verified?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentCable = await db.estimateCable.findUniqueOrThrow({
    where: { id: cableId },
    select: { estimateId: true },
  });
  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: parentCable.estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  const cable = await db.estimateCable.update({
    where: { id: cableId },
    data,
  });

  revalidatePath(`/estimering/${cable.estimateId}`);
  return cable;
}

export async function deleteCable(cableId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentCable = await db.estimateCable.findUniqueOrThrow({
    where: { id: cableId },
    select: { estimateId: true },
  });
  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: parentCable.estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  const cable = await db.estimateCable.delete({ where: { id: cableId } });
  revalidatePath(`/estimering/${cable.estimateId}`);
}

export async function addCable(
  estimateId: string,
  data: {
    tagNumber?: string;
    cableType: string;
    fromLocation?: string;
    toLocation?: string;
    lengthMeters: number;
    sizeCategory?: string;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  await db.estimateCable.create({
    data: {
      ...data,
      tagNumber: data.tagNumber || null,
      fromLocation: data.fromLocation || null,
      toLocation: data.toLocation || null,
      sizeCategory: data.sizeCategory || null,
      verified: true,
      estimateId,
    },
  });

  revalidatePath(`/estimering/${estimateId}`);
}

// ─── Utstyr ─────────────────────────────────────────────────────────

export async function updateEquipment(
  equipmentId: string,
  data: {
    tagNumber?: string;
    name?: string;
    type?: string;
    action?: string;
    quantity?: number;
    adjustmentFactor?: number;
    adjustmentNote?: string;
    verified?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentEquip = await db.estimateEquipment.findUniqueOrThrow({
    where: { id: equipmentId },
    select: { estimateId: true },
  });
  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: parentEquip.estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  const equip = await db.estimateEquipment.update({
    where: { id: equipmentId },
    data,
  });

  revalidatePath(`/estimering/${equip.estimateId}`);
  return equip;
}

export async function deleteEquipment(equipmentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentEquip = await db.estimateEquipment.findUniqueOrThrow({
    where: { id: equipmentId },
    select: { estimateId: true },
  });
  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: parentEquip.estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  const equip = await db.estimateEquipment.delete({
    where: { id: equipmentId },
  });
  revalidatePath(`/estimering/${equip.estimateId}`);
}

export async function addEquipment(
  estimateId: string,
  data: {
    tagNumber?: string;
    name: string;
    type: string;
    action: string;
    quantity?: number;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  await db.estimateEquipment.create({
    data: {
      ...data,
      tagNumber: data.tagNumber || null,
      quantity: data.quantity ?? 1,
      verified: true,
      estimateId,
    },
  });

  revalidatePath(`/estimering/${estimateId}`);
}

// ─── Omfangsposter ──────────────────────────────────────────────────

export async function updateScopeItem(
  scopeItemId: string,
  data: {
    description?: string;
    discipline?: "ELECTRICAL" | "INSTRUMENT" | "ENGINEERING";
    quantity?: number;
    unit?: string;
    hoursPerUnit?: number;
    totalHours?: number;
    adjustmentFactor?: number;
    adjustmentNote?: string;
    verified?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentScope = await db.estimateScopeItem.findUniqueOrThrow({
    where: { id: scopeItemId },
    select: { estimateId: true },
  });
  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: parentScope.estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  // Beregn totalHours: antall * timer/enhet * tilkomstfaktor
  const updateData = { ...data };
  if (data.quantity !== undefined && data.hoursPerUnit !== undefined) {
    const factor = data.adjustmentFactor ?? 1.0;
    updateData.totalHours = data.quantity * data.hoursPerUnit * factor;
  } else if (data.adjustmentFactor !== undefined) {
    // Bare faktor endret - hent eksisterende verdier
    const existing = await db.estimateScopeItem.findUniqueOrThrow({
      where: { id: scopeItemId },
    });
    if (existing.hoursPerUnit) {
      const qty = data.quantity ?? existing.quantity;
      updateData.totalHours = qty * existing.hoursPerUnit * data.adjustmentFactor;
    }
  }

  const item = await db.estimateScopeItem.update({
    where: { id: scopeItemId },
    data: updateData,
  });

  revalidatePath(`/estimering/${item.estimateId}`);
  return item;
}

export async function deleteScopeItem(scopeItemId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentScope = await db.estimateScopeItem.findUniqueOrThrow({
    where: { id: scopeItemId },
    select: { estimateId: true },
  });
  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: parentScope.estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  const item = await db.estimateScopeItem.delete({
    where: { id: scopeItemId },
  });
  revalidatePath(`/estimering/${item.estimateId}`);
}

// ─── Materialer ─────────────────────────────────────────────────────

export async function updateLineItem(
  lineItemId: string,
  data: {
    description?: string;
    productId?: string | null;
    quantity?: number;
    unit?: string;
    unitPriceNOK?: number;
    totalPriceNOK?: number;
    verified?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentLineItem = await db.estimateLineItem.findUniqueOrThrow({
    where: { id: lineItemId },
    select: { estimateId: true },
  });
  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: parentLineItem.estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  const updateData = { ...data };
  if (data.quantity !== undefined && data.unitPriceNOK !== undefined) {
    updateData.totalPriceNOK = data.quantity * data.unitPriceNOK;
  }

  const item = await db.estimateLineItem.update({
    where: { id: lineItemId },
    data: updateData,
  });

  revalidatePath(`/estimering/${item.estimateId}`);
  return item;
}

export async function addLineItem(
  estimateId: string,
  data: {
    description: string;
    productId?: string;
    quantity: number;
    unit?: string;
    unitPriceNOK?: number;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  await db.estimateLineItem.create({
    data: {
      description: data.description,
      productId: data.productId || null,
      quantity: data.quantity,
      unit: data.unit || "stk",
      unitPriceNOK: data.unitPriceNOK || null,
      totalPriceNOK:
        data.unitPriceNOK ? data.quantity * data.unitPriceNOK : null,
      verified: true,
      estimateId,
    },
  });

  revalidatePath(`/estimering/${estimateId}`);
}

export async function deleteLineItem(lineItemId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentLineItem = await db.estimateLineItem.findUniqueOrThrow({
    where: { id: lineItemId },
    select: { estimateId: true },
  });
  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: parentLineItem.estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  const item = await db.estimateLineItem.delete({
    where: { id: lineItemId },
  });
  revalidatePath(`/estimering/${item.estimateId}`);
}

// ─── Bulk-verifisering ──────────────────────────────────────────────

export async function verifyAllItems(estimateId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    select: { createdById: true },
  });
  await assertCanModify(estimate);

  await Promise.all([
    db.estimateCable.updateMany({
      where: { estimateId },
      data: { verified: true },
    }),
    db.estimateEquipment.updateMany({
      where: { estimateId },
      data: { verified: true },
    }),
    db.estimateScopeItem.updateMany({
      where: { estimateId },
      data: { verified: true },
    }),
    db.estimateLineItem.updateMany({
      where: { estimateId },
      data: { verified: true },
    }),
  ]);

  await db.estimate.update({
    where: { id: estimateId },
    data: { status: "APPROVED" },
  });

  revalidatePath(`/estimering/${estimateId}`);
}

// ─── Status-endring ─────────────────────────────────────────────────

export async function addScopeItem(
  estimateId: string,
  data: {
    description: string;
    discipline: "ELECTRICAL" | "INSTRUMENT" | "ENGINEERING";
    quantity: number;
    unit?: string;
    hoursPerUnit?: number;
    normId?: string;
    adjustmentFactor?: number;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  const factor = data.adjustmentFactor ?? 1.0;
  const totalHours = data.hoursPerUnit
    ? data.quantity * data.hoursPerUnit * factor
    : null;

  await db.estimateScopeItem.create({
    data: {
      description: data.description,
      discipline: data.discipline,
      quantity: data.quantity,
      unit: data.unit || "stk",
      hoursPerUnit: data.hoursPerUnit || null,
      normId: data.normId || null,
      adjustmentFactor: factor,
      totalHours,
      verified: true,
      estimateId,
    },
  });

  revalidatePath(`/estimering/${estimateId}`);
}

// ─── Kalkyle: Legg til linje fra norm ──────────────────────────────

export async function addCalculatorLine(
  estimateId: string,
  data: {
    normId: string;
    quantity: number;
    adjustmentFactor?: number;
    description?: string;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  const norm = await db.workNorm.findUniqueOrThrow({
    where: { id: data.normId },
    include: { category: true },
  });

  const factor = data.adjustmentFactor ?? 1.0;
  const totalHours = data.quantity * norm.hoursPerUnit * factor;
  const description = data.description || `${norm.category.name} - ${norm.name}`;

  // Bestem disiplin fra normens kategori
  const discipline = norm.category.discipline;

  await db.estimateScopeItem.create({
    data: {
      description,
      discipline,
      normId: norm.id,
      quantity: data.quantity,
      unit: norm.unit,
      hoursPerUnit: norm.hoursPerUnit,
      adjustmentFactor: factor,
      totalHours,
      verified: true,
      estimateId,
    },
  });

  revalidatePath(`/estimering/${estimateId}`);
}

// ─── Produktsok ────────────────────────────────────────────────────

export async function searchProductsAction(query: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  return db.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { productId: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
  });
}

export async function addLineItemFromProduct(
  estimateId: string,
  data: {
    productId: string;
    description: string;
    quantity: number;
    unit: string;
    unitPriceNOK: number | null;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  await db.estimateLineItem.create({
    data: {
      description: data.description,
      productId: data.productId,
      quantity: data.quantity,
      unit: data.unit,
      unitPriceNOK: data.unitPriceNOK,
      totalPriceNOK: data.unitPriceNOK
        ? data.quantity * data.unitPriceNOK
        : null,
      verified: true,
      estimateId,
    },
  });

  revalidatePath(`/estimering/${estimateId}`);
}

// ─── Faktisk medgatt tid ───────────────────────────────────────────

export async function registerActualTime(
  estimateId: string,
  entries: {
    discipline: "ELECTRICAL" | "INSTRUMENT" | "ENGINEERING";
    category: string;
    description?: string;
    estimatedHours: number;
    actualHours: number;
    adjustmentFactor?: number;
    adjustmentNote?: string;
    normId?: string;
  }[]
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    select: { createdById: true },
  });
  await assertCanModify(estimate);

  const totalActualHours = entries.reduce((s, e) => s + e.actualHours, 0);

  await db.$transaction([
    db.actualTimeEntry.createMany({
      data: entries.map((e) => ({
        estimateId,
        discipline: e.discipline,
        category: e.category,
        description: e.description || null,
        estimatedHours: e.estimatedHours,
        actualHours: e.actualHours,
        adjustmentFactor: e.adjustmentFactor || null,
        adjustmentNote: e.adjustmentNote || null,
        normId: e.normId || null,
        registeredById: session.user!.id!,
        registeredByName: session.user!.name || "Ukjent",
      })),
    }),
    db.estimate.update({
      where: { id: estimateId },
      data: {
        status: "COMPLETED",
        actualLaborHours: totalActualHours,
        completedAt: new Date(),
      },
    }),
  ]);

  revalidatePath(`/estimering/${estimateId}`);
}

export async function updateActualCableTime(
  cableId: string,
  data: {
    actualHours: number;
    adjustmentFactor?: number;
    adjustmentNote?: string;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const parentCable = await db.estimateCable.findUniqueOrThrow({
    where: { id: cableId },
    select: { estimateId: true },
  });
  const parentEstimate = await db.estimate.findUniqueOrThrow({
    where: { id: parentCable.estimateId },
    select: { createdById: true },
  });
  await assertCanModify(parentEstimate);

  const cable = await db.estimateCable.update({
    where: { id: cableId },
    data: {
      actualHours: data.actualHours,
      adjustmentFactor: data.adjustmentFactor || null,
      adjustmentNote: data.adjustmentNote || null,
    },
  });

  revalidatePath(`/estimering/${cable.estimateId}`);
}

// ─── Statistisk normoppdatering ────────────────────────────────────

export async function updateNormFromStatistics(normId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  // Hent alle faktisk-tid-registreringer for denne normen (uten justeringsfaktor)
  const entries = await db.actualTimeEntry.findMany({
    where: { normId, adjustmentFactor: null },
  });

  if (entries.length < 3) {
    throw new Error(
      "Trenger minst 3 datapunkter uten justeringsfaktor for statistisk oppdatering"
    );
  }

  const norm = await db.workNorm.findUniqueOrThrow({ where: { id: normId } });

  // Beregn vektet gjennomsnitt av faktisk/estimert ratio
  const ratios = entries.map((e) => e.actualHours / e.estimatedHours);
  const avgRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length;
  const variance =
    ratios.reduce((s, r) => s + Math.pow(r - avgRatio, 2), 0) / ratios.length;
  const stdDev = Math.sqrt(variance);

  // Ny hoursPerUnit = gammel * avgRatio (med avrunding)
  const newValue =
    Math.round(norm.hoursPerUnit * avgRatio * 1000) / 1000;
  const avgActual =
    entries.reduce((s, e) => s + e.actualHours, 0) / entries.length;

  await db.$transaction([
    db.workNorm.update({
      where: { id: normId },
      data: { hoursPerUnit: newValue },
    }),
    db.normUpdateLog.create({
      data: {
        normId,
        previousValue: norm.hoursPerUnit,
        newValue,
        dataPoints: entries.length,
        avgActual,
        stdDeviation: stdDev,
        updatedById: session.user!.id!,
        updatedByName: session.user!.name || "Ukjent",
        autoUpdated: true,
      },
    }),
  ]);

  revalidatePath("/estimering");
  revalidatePath("/admin/normer");
  return { previousValue: norm.hoursPerUnit, newValue, dataPoints: entries.length };
}

export async function manualUpdateNorm(
  normId: string,
  newValue: number
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const norm = await db.workNorm.findUniqueOrThrow({ where: { id: normId } });

  await db.$transaction([
    db.workNorm.update({
      where: { id: normId },
      data: { hoursPerUnit: newValue },
    }),
    db.normUpdateLog.create({
      data: {
        normId,
        previousValue: norm.hoursPerUnit,
        newValue,
        dataPoints: 0,
        avgActual: 0,
        stdDeviation: null,
        updatedById: session.user!.id!,
        updatedByName: session.user!.name || "Ukjent",
        autoUpdated: false,
      },
    }),
  ]);

  revalidatePath("/estimering");
  revalidatePath("/admin/normer");
}

export async function updateEstimateStatus(
  estimateId: string,
  status: "DRAFT" | "REVIEW" | "APPROVED" | "COMPLETED" | "ARCHIVED"
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    select: { createdById: true },
  });
  await assertCanModify(estimate);

  const updateData: Record<string, unknown> = { status };
  if (status === "COMPLETED") {
    updateData.completedAt = new Date();
  }

  await db.estimate.update({
    where: { id: estimateId },
    data: updateData,
  });

  revalidatePath(`/estimering/${estimateId}`);
}

// ─── Prosjektinnstillinger ──────────────────────────────────────────

export async function updateEstimateSettings(
  estimateId: string,
  data: {
    markupPercent?: number;
    contingencyPercent?: number;
    fieldEngineerPercent?: number;
    mobDemobCost?: number;
    equipmentRentalCost?: number;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    select: { createdById: true },
  });
  await assertCanModify(estimate);

  await db.estimate.update({
    where: { id: estimateId },
    data,
  });

  revalidatePath(`/estimering/${estimateId}`);
}

// ─── Beregning ──────────────────────────────────────────────────────

export async function calculateEstimate(estimateId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const estimate = await db.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    select: { createdById: true },
  });
  await assertCanModify(estimate);

  const { recalculateEstimate } = await import("@/lib/estimering/calculator");
  await recalculateEstimate(estimateId);

  revalidatePath(`/estimering/${estimateId}`);
}
