"use server";

import { auth } from "@/lib/auth";
import { assertCanModify } from "@/lib/rbac";
import { db } from "@/lib/db";
import { createFormLinkSchema } from "@/lib/validations/evaluation-link";
import { revalidatePath } from "next/cache";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export async function createEvaluationLink(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const raw = {
    personnelId: (formData.get("personnelId") as string) || undefined,
    title: formData.get("title") as string,
    formType: (formData.get("formType") as string) || "EVALUATION",
    categoryId: (formData.get("categoryId") as string) || undefined,
    expiresAt: (formData.get("expiresAt") as string) || undefined,
  };

  const parsed = createFormLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db.evaluationLink.create({
    data: {
      personnelId: parsed.data.personnelId || undefined,
      title: parsed.data.title,
      formType: parsed.data.formType,
      categoryId:
        parsed.data.formType === "CUSTOM_FIELDS"
          ? parsed.data.categoryId
          : undefined,
      expiresAt: parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null,
      createdById: session.user.id,
      createdBy: session.user.name ?? "Ukjent",
    },
  });

  revalidatePath("/skjema");
  return { success: true, message: "Skjemalink opprettet" };
}

export async function toggleEvaluationLink(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const id = formData.get("id") as string;
  const link = await db.evaluationLink.findUnique({ where: { id } });
  if (!link) return { message: "Link ikke funnet" };

  await assertCanModify(link);

  await db.evaluationLink.update({
    where: { id },
    data: { active: !link.active },
  });

  revalidatePath("/skjema");
  return {
    success: true,
    message: link.active ? "Link deaktivert" : "Link aktivert",
  };
}

export async function deleteEvaluationLink(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const id = formData.get("id") as string;
  const link = await db.evaluationLink.findUnique({ where: { id } });
  if (!link) return { message: "Link ikke funnet" };

  await assertCanModify(link);

  await db.evaluationLink.delete({ where: { id } });

  revalidatePath("/skjema");
  return { success: true, message: "Link slettet" };
}
