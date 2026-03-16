"use server";

import { auth } from "@/lib/auth";
import { isAdmin, assertAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { runSync, type SyncResourceType } from "@/lib/poweroffice/sync-all";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

export async function triggerSync(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "Ikke autentisert" };
  }

  const admin = await isAdmin();
  if (!admin) {
    return { message: "Kun administratorer kan starte synkronisering" };
  }

  const resource = (formData.get("resource") as SyncResourceType) ?? "all";

  try {
    await runSync(resource, session.user.id);
    revalidatePath("/poweroffice");
    return { message: "Synkronisering fullført" };
  } catch (error) {
    return {
      message: `Synkronisering feilet: ${error instanceof Error ? error.message : "Ukjent feil"}`,
    };
  }
}

export async function linkEmployeeToPersonnel(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { message: "Ikke autentisert" };
  }

  await assertAdmin();

  const poEmployeeId = formData.get("poEmployeeId") as string;
  const personnelId = formData.get("personnelId") as string;

  if (!poEmployeeId || !personnelId) {
    return { errors: { poEmployeeId: ["Velg en ansatt og personell-oppføring"] } };
  }

  try {
    await db.pOEmployee.update({
      where: { id: poEmployeeId },
      data: { personnelId },
    });

    revalidatePath("/poweroffice/ansatte");
    return { message: "Kobling opprettet" };
  } catch {
    return { message: "Kunne ikke opprette kobling" };
  }
}

export async function unlinkEmployee(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { message: "Ikke autentisert" };
  }

  await assertAdmin();

  const poEmployeeId = formData.get("poEmployeeId") as string;

  try {
    await db.pOEmployee.update({
      where: { id: poEmployeeId },
      data: { personnelId: null },
    });

    revalidatePath("/poweroffice/ansatte");
    return { message: "Kobling fjernet" };
  } catch {
    return { message: "Kunne ikke fjerne kobling" };
  }
}
