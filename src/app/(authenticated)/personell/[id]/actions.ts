"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/rbac";
import { updatePersonnelSchema } from "@/lib/validations/personnel";
import { getFormString, getFormStringOptional } from "@/lib/utils";
import { createNoteSchema } from "@/lib/validations/notes";
import { createEvaluationSchema, calculateTotalScore, EVALUATION_CRITERIA } from "@/lib/validations/evaluation";
import {
  saveFieldValuesSchema,
  createCategorySchema,
  createFieldDefinitionSchema,
  updateFieldDefinitionSchema,
} from "@/lib/validations/custom-fields";
import { revalidatePath } from "next/cache";

function validateFieldType(
  value: string,
  type: string,
  fieldName: string,
  options: string | null
): string | null {
  switch (type) {
    case "NUMBER":
      if (isNaN(Number(value))) return `${fieldName} må være et tall`;
      break;
    case "DATE":
      if (isNaN(Date.parse(value))) return `${fieldName} må være en gyldig dato`;
      break;
    case "SELECT":
      if (options) {
        const allowed = options.split(",").map((o) => o.trim());
        if (!allowed.includes(value))
          return `${fieldName} har en ugyldig verdi`;
      }
      break;
    case "BOOLEAN":
      if (value !== "true" && value !== "false")
        return `${fieldName} må være true eller false`;
      break;
  }
  return null;
}

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export async function updatePersonnel(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const raw = {
    id: getFormString(formData, "id"),
    name: getFormString(formData, "name"),
    role: getFormString(formData, "role"),
    email: getFormStringOptional(formData, "email"),
    phone: getFormStringOptional(formData, "phone"),
    department: getFormStringOptional(formData, "department"),
    rig: getFormStringOptional(formData, "rig"),
  };

  const parsed = updatePersonnelSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { id, ...data } = parsed.data;
  await db.personnel.update({ where: { id }, data });

  revalidatePath(`/personell/${id}`);
  return { success: true, message: "Personell oppdatert" };
}

export async function addNote(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const raw = {
    content: formData.get("content") as string,
    personnelId: formData.get("personnelId") as string,
  };

  const parsed = createNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db.note.create({
    data: {
      ...parsed.data,
      authorId: session.user.id,
      authorName: session.user.name ?? "Ukjent",
    },
  });

  revalidatePath(`/personell/${parsed.data.personnelId}`);
  return { success: true, message: "Notat lagt til" };
}

export async function addEvaluationFromCard(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const raw: Record<string, unknown> = {
    personnelId: formData.get("personnelId") as string,
    comment: (formData.get("comment") as string) || undefined,
  };
  for (const c of EVALUATION_CRITERIA) {
    raw[c.key] = formData.get(c.key);
  }

  const parsed = createEvaluationSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const criteriaValues: Record<string, number> = {};
  for (const c of EVALUATION_CRITERIA) {
    criteriaValues[c.key] = parsed.data[c.key as keyof typeof parsed.data] as number;
  }
  const totalScore = calculateTotalScore(criteriaValues);

  await db.evaluation.create({
    data: {
      personnelId: parsed.data.personnelId!,
      score: totalScore,
      hpiSafety: parsed.data.hpiSafety,
      competence: parsed.data.competence,
      collaboration: parsed.data.collaboration,
      workEthic: parsed.data.workEthic,
      independence: parsed.data.independence,
      punctuality: parsed.data.punctuality,
      comment: parsed.data.comment,
      evaluatorId: session.user.id,
      evaluatorName: session.user.name ?? "Ukjent",
    },
  });

  revalidatePath(`/personell/${parsed.data.personnelId}`);
  return { success: true, message: "Evaluering lagt til" };
}

export async function saveFieldValues(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const personnelId = formData.get("personnelId") as string;
  const fieldIds = formData.getAll("fieldId") as string[];
  const values = fieldIds.map((fieldId) => ({
    fieldId,
    value: (formData.get(`field_${fieldId}`) as string) ?? "",
  }));

  const parsed = saveFieldValuesSchema.safeParse({ personnelId, values });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // Fetch field definitions to validate types
  const fieldDefs = await db.fieldDefinition.findMany({
    where: { id: { in: parsed.data.values.map((v) => v.fieldId) } },
  });
  const fieldDefMap = new Map(fieldDefs.map((f) => [f.id, f]));

  for (const { fieldId, value } of parsed.data.values) {
    if (value) {
      // Validate value against field type
      const fieldDef = fieldDefMap.get(fieldId);
      if (fieldDef) {
        const typeError = validateFieldType(value, fieldDef.type, fieldDef.name, fieldDef.options);
        if (typeError) {
          return { errors: { [fieldId]: [typeError] } };
        }
      }

      await db.fieldValue.upsert({
        where: { personnelId_fieldId: { personnelId, fieldId } },
        create: { personnelId, fieldId, value },
        update: { value },
      });
    } else {
      await db.fieldValue.deleteMany({
        where: { personnelId, fieldId },
      });
    }
  }

  revalidatePath(`/personell/${personnelId}`);
  return { success: true, message: "Felt oppdatert" };
}

export async function createFieldCategory(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const raw = {
    name: formData.get("name") as string,
    order: formData.get("order") ?? 0,
  };

  const parsed = createCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db.fieldCategory.create({ data: parsed.data });

  const personnelId = formData.get("personnelId") as string;
  revalidatePath(`/personell/${personnelId}`);
  return { success: true, message: "Kategori opprettet" };
}

export async function deleteFieldCategory(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const id = formData.get("id") as string;
  await db.fieldCategory.delete({ where: { id } });

  const personnelId = formData.get("personnelId") as string;
  revalidatePath(`/personell/${personnelId}`);
  return { success: true, message: "Kategori slettet" };
}

export async function createFieldDefinition(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const raw = {
    name: formData.get("name") as string,
    type: formData.get("type") as string,
    options: (formData.get("options") as string) || undefined,
    required: formData.get("required") === "true",
    order: formData.get("order") ?? 0,
    categoryId: formData.get("categoryId") as string,
  };

  const parsed = createFieldDefinitionSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db.fieldDefinition.create({ data: parsed.data });

  const personnelId = formData.get("personnelId") as string;
  revalidatePath(`/personell/${personnelId}`);
  return { success: true, message: "Felt opprettet" };
}

export async function updateFieldDefinition(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const raw = {
    id: formData.get("id") as string,
    name: formData.get("name") as string,
    type: formData.get("type") as string,
    options: (formData.get("options") as string) || undefined,
    required: formData.get("required") === "true",
    order: formData.get("order") ?? 0,
  };

  const parsed = updateFieldDefinitionSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { id, ...data } = parsed.data;
  await db.fieldDefinition.update({ where: { id }, data });

  const personnelId = formData.get("personnelId") as string;
  revalidatePath(`/personell/${personnelId}`);
  return { success: true, message: "Felt oppdatert" };
}

export async function deleteFieldDefinition(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const id = formData.get("id") as string;
  await db.fieldDefinition.delete({ where: { id } });

  const personnelId = formData.get("personnelId") as string;
  revalidatePath(`/personell/${personnelId}`);
  return { success: true, message: "Felt slettet" };
}

export async function deleteEvaluation(evaluationId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const evaluation = await db.evaluation.findUnique({
    where: { id: evaluationId },
    select: { evaluatorId: true, personnelId: true },
  });
  if (!evaluation) return { message: "Evaluering ikke funnet" };

  // Only the evaluator or admin can delete
  const admin = await isAdmin();
  if (evaluation.evaluatorId !== session.user.id && !admin) {
    return { message: "Ikke autorisert" };
  }

  await db.evaluation.delete({ where: { id: evaluationId } });
  revalidatePath(`/personell/${evaluation.personnelId}`);
  return { success: true, message: "Evaluering slettet" };
}

export async function deleteNote(noteId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const note = await db.note.findUnique({
    where: { id: noteId },
    select: { authorId: true, personnelId: true },
  });
  if (!note) return { message: "Notat ikke funnet" };

  const admin = await isAdmin();
  if (note.authorId !== session.user.id && !admin) {
    return { message: "Ikke autorisert" };
  }

  await db.note.delete({ where: { id: noteId } });
  revalidatePath(`/personell/${note.personnelId}`);
  return { success: true, message: "Notat slettet" };
}

export async function archivePersonnel(personnelId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const admin = await isAdmin();
  if (!admin) return { message: "Kun admin kan arkivere personell" };

  await db.personnel.update({
    where: { id: personnelId },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/personell");
  revalidatePath(`/personell/${personnelId}`);
  return { success: true, message: "Personell arkivert" };
}
