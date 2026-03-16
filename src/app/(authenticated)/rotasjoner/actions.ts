"use server";

import { auth } from "@/lib/auth";
import { assertCanModify } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  createRotationPatternSchema,
  updateRotationPatternSchema,
} from "@/lib/validations/rotation";
import { revalidatePath } from "next/cache";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export async function createRotationPattern(
  data: {
    name: string;
    description?: string;
    segments: { type: string; days: number; sortOrder: number; label?: string }[];
  }
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createRotationPatternSchema.safeParse(data);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const totalCycleDays = parsed.data.segments.reduce((sum, s) => sum + s.days, 0);

  await db.rotationPattern.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      totalCycleDays,
      createdById: session.user.id,
      createdByName: session.user.name ?? "Ukjent",
      segments: {
        create: parsed.data.segments.map((s, i) => ({
          type: s.type,
          days: s.days,
          sortOrder: s.sortOrder ?? i,
          label: s.label,
        })),
      },
    },
  });

  revalidatePath("/rotasjoner");
  return { success: true, message: "Rotasjonsmønster opprettet" };
}

export async function updateRotationPattern(
  data: {
    id: string;
    name?: string;
    description?: string;
    isActive?: boolean;
    segments?: { type: string; days: number; sortOrder: number; label?: string }[];
  }
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = updateRotationPatternSchema.safeParse(data);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { id, segments, ...updateData } = parsed.data;

  const existing = await db.rotationPattern.findUnique({ where: { id } });
  if (!existing) return { message: "Rotasjonsmønster ikke funnet" };
  await assertCanModify(existing);

  if (segments) {
    const totalCycleDays = segments.reduce((sum, s) => sum + s.days, 0);

    // Slett eksisterende segmenter og erstatt
    await db.rotationSegment.deleteMany({ where: { rotationPatternId: id } });
    await db.rotationPattern.update({
      where: { id },
      data: {
        ...updateData,
        totalCycleDays,
        segments: {
          create: segments.map((s, i) => ({
            type: s.type,
            days: s.days,
            sortOrder: s.sortOrder ?? i,
            label: s.label,
          })),
        },
      },
    });
  } else {
    await db.rotationPattern.update({ where: { id }, data: updateData });
  }

  revalidatePath("/rotasjoner");
  return { success: true, message: "Rotasjonsmønster oppdatert" };
}

export async function deleteRotationPattern(id: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const pattern = await db.rotationPattern.findUnique({ where: { id } });
  if (!pattern) return { message: "Rotasjonsmønster ikke funnet" };
  await assertCanModify(pattern);

  // Sjekk om mønsteret er i bruk
  const usage = await db.rotationPattern.findUnique({
    where: { id },
    include: { _count: { select: { jobs: true, assignments: true } } },
  });

  if (usage && (usage._count.jobs > 0 || usage._count.assignments > 0)) {
    // Soft-delete (deaktiver) i stedet for å slette
    await db.rotationPattern.update({
      where: { id },
      data: { isActive: false },
    });
    revalidatePath("/rotasjoner");
    return { success: true, message: "Rotasjonsmønster deaktivert (i bruk)" };
  }

  await db.rotationPattern.delete({ where: { id } });
  revalidatePath("/rotasjoner");
  return { success: true, message: "Rotasjonsmønster slettet" };
}
