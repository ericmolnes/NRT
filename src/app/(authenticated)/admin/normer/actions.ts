"use server";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createNormCategory(data: {
  name: string;
  discipline: "ELECTRICAL" | "INSTRUMENT" | "ENGINEERING";
  description?: string;
}) {
  const session = await auth();
  if (!session?.user || !(await isAdmin())) throw new Error("Ikke autorisert");

  const maxOrder = await db.normCategory.aggregate({ _max: { order: true } });
  const order = (maxOrder._max.order ?? 0) + 1;

  await db.normCategory.create({
    data: {
      name: data.name,
      discipline: data.discipline,
      description: data.description || null,
      order,
    },
  });

  revalidatePath("/admin/normer");
}

export async function updateNormCategory(
  categoryId: string,
  data: { name?: string; description?: string }
) {
  const session = await auth();
  if (!session?.user || !(await isAdmin())) throw new Error("Ikke autorisert");

  await db.normCategory.update({
    where: { id: categoryId },
    data,
  });

  revalidatePath("/admin/normer");
}

export async function createWorkNorm(data: {
  name: string;
  hoursPerUnit: number;
  unit: string;
  sizeRange?: string;
  categoryId: string;
}) {
  const session = await auth();
  if (!session?.user || !(await isAdmin())) throw new Error("Ikke autorisert");

  await db.workNorm.create({
    data: {
      name: data.name,
      hoursPerUnit: data.hoursPerUnit,
      unit: data.unit,
      sizeRange: data.sizeRange || null,
      categoryId: data.categoryId,
    },
  });

  revalidatePath("/admin/normer");
}

export async function deleteWorkNorm(normId: string) {
  const session = await auth();
  if (!session?.user || !(await isAdmin())) throw new Error("Ikke autorisert");

  // Sjekk om normen er i bruk
  const usageCount = await db.estimateScopeItem.count({
    where: { normId },
  });

  if (usageCount > 0) {
    throw new Error(
      `Kan ikke slette normen - den er i bruk i ${usageCount} estimatpost(er)`
    );
  }

  await db.workNorm.delete({ where: { id: normId } });
  revalidatePath("/admin/normer");
}

export async function deleteNormCategory(categoryId: string) {
  const session = await auth();
  if (!session?.user || !(await isAdmin())) throw new Error("Ikke autorisert");

  // Sjekk om kategorien har normer
  const normCount = await db.workNorm.count({
    where: { categoryId },
  });

  if (normCount > 0) {
    throw new Error(
      `Kan ikke slette kategorien - den har ${normCount} norm(er). Slett normene forst.`
    );
  }

  await db.normCategory.delete({ where: { id: categoryId } });
  revalidatePath("/admin/normer");
}
