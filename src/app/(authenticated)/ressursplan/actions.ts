"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createResourcePlanSchema,
  createEntrySchema,
  updateEntrySchema,
  bulkSetAllocationsSchema,
  clearAllocationsSchema,
  createLabelSchema,
  updateLabelSchema,
} from "@/lib/validations/resource-plan";
import { computeAllocationChanges, computeClearChanges } from "@/lib/resource-plan-utils";
import { revalidatePath } from "next/cache";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export async function createResourcePlan(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createResourcePlanSchema.safeParse({
    year: formData.get("year"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db.resourcePlan.create({
    data: {
      ...parsed.data,
      createdById: session.user.id,
      createdBy: session.user.name ?? "Ukjent",
    },
  });

  revalidatePath("/ressursplan");
  return { success: true, message: "Ressursplan opprettet" };
}

export async function addEntry(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createEntrySchema.safeParse({
    resourcePlanId: formData.get("resourcePlanId"),
    personnelId: formData.get("personnelId") || undefined,
    displayName: formData.get("displayName"),
    crew: formData.get("crew") || undefined,
    location: formData.get("location") || undefined,
    company: formData.get("company") || undefined,
    notes: formData.get("notes") || undefined,
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db.resourcePlanEntry.create({ data: parsed.data });

  revalidatePath("/ressursplan");
  return { success: true, message: "Person lagt til" };
}

export async function updateEntry(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = updateEntrySchema.safeParse({
    id: formData.get("id"),
    displayName: formData.get("displayName") || undefined,
    crew: formData.get("crew") || undefined,
    location: formData.get("location") || undefined,
    company: formData.get("company") || undefined,
    notes: formData.get("notes") || undefined,
    sortOrder: formData.get("sortOrder") ?? undefined,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { id, ...data } = parsed.data;
  await db.resourcePlanEntry.update({ where: { id }, data });

  revalidatePath("/ressursplan");
  return { success: true, message: "Person oppdatert" };
}

export async function removeEntry(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const id = formData.get("id") as string;
  await db.resourcePlanEntry.delete({ where: { id } });

  revalidatePath("/ressursplan");
  return { success: true, message: "Person fjernet" };
}

export async function bulkSetAllocations(
  data: {
    entryIds: string[];
    startDate: string;
    endDate: string;
    label: string;
  }
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = bulkSetAllocationsSchema.safeParse(data);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { entryIds, startDate, endDate, label } = parsed.data;

  for (const entryId of entryIds) {
    const existing = await db.resourceAllocation.findMany({
      where: {
        entryId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    const changes = computeAllocationChanges(
      existing.map((a) => ({
        id: a.id,
        entryId: a.entryId,
        startDate: a.startDate,
        endDate: a.endDate,
        label: a.label,
      })),
      startDate,
      endDate,
      label
    );

    await db.$transaction([
      ...(changes.toDelete.length > 0
        ? [db.resourceAllocation.deleteMany({ where: { id: { in: changes.toDelete } } })]
        : []),
      ...changes.toUpdate.map((u) =>
        db.resourceAllocation.update({
          where: { id: u.id },
          data: { startDate: u.startDate, endDate: u.endDate },
        })
      ),
      ...changes.toCreate.map((c) =>
        db.resourceAllocation.create({
          data: { entryId, startDate: c.startDate, endDate: c.endDate, label: c.label },
        })
      ),
    ]);
  }

  revalidatePath("/ressursplan");
  return { success: true, message: "Tilordninger oppdatert" };
}

export async function clearAllocations(
  data: {
    entryIds: string[];
    startDate: string;
    endDate: string;
  }
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = clearAllocationsSchema.safeParse(data);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { entryIds, startDate, endDate } = parsed.data;

  for (const entryId of entryIds) {
    const existing = await db.resourceAllocation.findMany({
      where: {
        entryId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    const changes = computeClearChanges(
      existing.map((a) => ({
        id: a.id,
        entryId: a.entryId,
        startDate: a.startDate,
        endDate: a.endDate,
        label: a.label,
      })),
      startDate,
      endDate
    );

    await db.$transaction([
      ...(changes.toDelete.length > 0
        ? [db.resourceAllocation.deleteMany({ where: { id: { in: changes.toDelete } } })]
        : []),
      ...changes.toUpdate.map((u) =>
        db.resourceAllocation.update({
          where: { id: u.id },
          data: { startDate: u.startDate, endDate: u.endDate },
        })
      ),
      ...changes.toCreate.map((c) =>
        db.resourceAllocation.create({
          data: { entryId, startDate: c.startDate, endDate: c.endDate, label: c.label },
        })
      ),
    ]);
  }

  revalidatePath("/ressursplan");
  return { success: true, message: "Tilordninger fjernet" };
}

// ─── Label CRUD ─────────────────────────────────────────────────────

export async function createLabel(
  data: { resourcePlanId: string; name: string; color: string; textColor?: string; category?: string }
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createLabelSchema.safeParse(data);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const count = await db.resourcePlanLabel.count({
    where: { resourcePlanId: parsed.data.resourcePlanId },
  });

  await db.resourcePlanLabel.create({
    data: { ...parsed.data, sortOrder: count },
  });

  revalidatePath("/ressursplan");
  return { success: true, message: "Label opprettet" };
}

export async function updateLabel(
  data: { id: string; name?: string; color?: string; textColor?: string; category?: string; sortOrder?: number }
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = updateLabelSchema.safeParse(data);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { id, ...updateData } = parsed.data;

  // Hvis navn endres, oppdater alle allokeringer som bruker det gamle navnet
  if (updateData.name) {
    const existing = await db.resourcePlanLabel.findUnique({ where: { id } });
    if (existing && existing.name !== updateData.name) {
      // Finn alle entries i denne planen
      const entries = await db.resourcePlanEntry.findMany({
        where: { resourcePlanId: existing.resourcePlanId },
        select: { id: true },
      });
      const entryIds = entries.map((e) => e.id);
      if (entryIds.length > 0) {
        await db.resourceAllocation.updateMany({
          where: { entryId: { in: entryIds }, label: existing.name },
          data: { label: updateData.name },
        });
      }
    }
  }

  await db.resourcePlanLabel.update({ where: { id }, data: updateData });

  revalidatePath("/ressursplan");
  return { success: true, message: "Label oppdatert" };
}

export async function deleteLabel(id: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const label = await db.resourcePlanLabel.findUnique({ where: { id } });
  if (!label) return { message: "Label ikke funnet" };

  // Slett alle allokeringer som bruker denne labelen
  const entries = await db.resourcePlanEntry.findMany({
    where: { resourcePlanId: label.resourcePlanId },
    select: { id: true },
  });
  const entryIds = entries.map((e) => e.id);
  if (entryIds.length > 0) {
    await db.resourceAllocation.deleteMany({
      where: { entryId: { in: entryIds }, label: label.name },
    });
  }

  await db.resourcePlanLabel.delete({ where: { id } });

  revalidatePath("/ressursplan");
  return { success: true, message: "Label slettet" };
}
