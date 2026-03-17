"use server";

import { auth } from "@/lib/auth";
import { assertCanModify } from "@/lib/rbac";
import { db } from "@/lib/db";
import { createFormLinkSchema } from "@/lib/validations/evaluation-link";
import { revalidatePath } from "next/cache";
import { randomBytes, scryptSync } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

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

  // Parse multi-select personnel IDs
  let personnelIds: string[] = [];
  const personnelIdsJson = formData.get("personnelIds") as string | null;
  if (personnelIdsJson) {
    try {
      const parsed = JSON.parse(personnelIdsJson);
      if (Array.isArray(parsed)) personnelIds = parsed.filter(Boolean);
    } catch { /* ignore */ }
  }

  const raw = {
    personnelId: personnelIds.length === 1 ? personnelIds[0] : undefined,
    title: formData.get("title") as string,
    formType: (formData.get("formType") as string) || "EVALUATION",
    authMode: (formData.get("authMode") as string) || "NONE",
    password: (formData.get("password") as string) || undefined,
    categoryId: (formData.get("categoryId") as string) || undefined,
    expiresAt: (formData.get("expiresAt") as string) || undefined,
  };

  const parsed = createFormLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const hashedPassword =
    parsed.data.authMode === "PASSWORD" && parsed.data.password
      ? hashPassword(parsed.data.password)
      : null;

  // Parse custom criteria JSON
  const criteriaJson = formData.get("criteria") as string | null;
  let criteria = null;
  if (criteriaJson && parsed.data.formType === "EVALUATION") {
    try {
      const parsed_criteria = JSON.parse(criteriaJson) as Array<{
        key: string;
        label: string;
        description: string;
      }>;
      // Only save if criteria were actually modified (non-empty labels)
      const validCriteria = parsed_criteria.filter((c) => c.label.trim());
      if (validCriteria.length > 0) {
        criteria = validCriteria;
      }
    } catch {
      // Ignore invalid JSON, will use defaults
    }
  }

  await db.evaluationLink.create({
    data: {
      personnelId: personnelIds.length === 1 ? personnelIds[0] : undefined,
      personnelIds: personnelIds.length > 1 ? personnelIds : undefined,
      title: parsed.data.title,
      formType: parsed.data.formType,
      authMode: parsed.data.authMode,
      password: hashedPassword,
      criteria: criteria ?? undefined,
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

export async function saveTemplate(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const name = (formData.get("templateName") as string)?.trim();
  const criteriaJson = formData.get("templateCriteria") as string;

  if (!name || name.length < 2) {
    return { errors: { templateName: ["Navn må ha minst 2 tegn"] } };
  }

  let criteria;
  try {
    criteria = JSON.parse(criteriaJson);
  } catch {
    return { message: "Ugyldig kriterie-data" };
  }

  // Check if name already exists
  const existing = await db.evaluationTemplate.findUnique({ where: { name } });
  if (existing) {
    // Update existing
    await db.evaluationTemplate.update({
      where: { name },
      data: { criteria },
    });
    revalidatePath("/skjema");
    return { success: true, message: `Mal "${name}" oppdatert` };
  }

  await db.evaluationTemplate.create({
    data: {
      name,
      criteria,
      createdById: session.user.id,
      createdBy: session.user.name ?? "Ukjent",
    },
  });

  revalidatePath("/skjema");
  return { success: true, message: `Mal "${name}" lagret` };
}

export async function deleteTemplate(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const id = formData.get("id") as string;
  await db.evaluationTemplate.delete({ where: { id } });

  revalidatePath("/skjema");
  return { success: true, message: "Mal slettet" };
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
