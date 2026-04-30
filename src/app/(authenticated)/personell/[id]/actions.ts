"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin, assertAdmin, assertUser } from "@/lib/rbac";
import { updatePersonnelSchema } from "@/lib/validations/personnel";
import { getFormString, getFormStringOptional } from "@/lib/utils";
import { createNoteSchema } from "@/lib/validations/notes";
import { createEvaluationSchema, calculateTotalScore, EVALUATION_CRITERIA } from "@/lib/validations/evaluation";
import { parseCourseDocument } from "@/lib/personell/document-parser";
import {
  approveCourseRecord,
  correctAndApproveCourseRecord,
  rejectCourseRecord,
  storePersonnelDocument,
  type CourseRecordsClient,
} from "@/lib/personell/course-records";
import {
  saveFieldValuesSchema,
  createCategorySchema,
  createFieldDefinitionSchema,
  updateFieldDefinitionSchema,
} from "@/lib/validations/custom-fields";
import {
  getDynamicFieldValue,
  shouldPersistDynamicFieldValue,
  validateDynamicFieldValue,
} from "@/lib/forms/dynamic-fields";
import { revalidatePath } from "next/cache";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

const MAX_PERSONNEL_DOCUMENT_BYTES = 25 * 1024 * 1024;
const MAX_TEXT_EXTRACTION_BYTES = 128 * 1024;
const ALLOWED_PERSONNEL_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function isValidIsoDate(value: string | undefined): boolean {
  return value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getActor(session: Session) {
  return {
    id: session?.user?.id ?? "",
    name: session?.user?.name ?? session?.user?.email ?? "Ukjent",
  };
}

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
    const fieldDef = fieldDefMap.get(fieldId);
    const normalizedValue = fieldDef
      ? getDynamicFieldValue(formData, fieldDef)
      : value;

    if (fieldDef) {
      const typeError = validateDynamicFieldValue(fieldDef, normalizedValue);
      if (typeError) {
        return { errors: { [fieldId]: [typeError] } };
      }
    }

    if (!fieldDef || shouldPersistDynamicFieldValue(fieldDef, normalizedValue)) {
      await db.fieldValue.upsert({
        where: { personnelId_fieldId: { personnelId, fieldId } },
        create: { personnelId, fieldId, value: normalizedValue },
        update: { value: normalizedValue },
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
  await assertAdmin();

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
  await assertAdmin();

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
  await assertAdmin();

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
  await assertAdmin();

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
  await assertAdmin();

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

export async function uploadPersonnelDocument(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };
  await assertUser();

  const personnelId = getFormString(formData, "personnelId");
  if (!personnelId) return { errors: { personnelId: ["Mangler personell"] } };
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name) {
    return { errors: { file: ["Velg en fil"] } };
  }
  if (file.size > MAX_PERSONNEL_DOCUMENT_BYTES) {
    return { errors: { file: ["Filen er for stor (maks 25 MB)"] } };
  }
  if (file.type && !ALLOWED_PERSONNEL_DOCUMENT_MIME_TYPES.has(file.type)) {
    return { errors: { file: ["Filtypen er ikke stottet"] } };
  }

  let text = getFormStringOptional(formData, "documentText") ?? "";
  if (!text && file.type.startsWith("text/") && file.size <= MAX_TEXT_EXTRACTION_BYTES) {
    text = await file.text();
  }

  const parsed = parseCourseDocument({
    fileName: file.name,
    text,
  });

  await storePersonnelDocument(db as unknown as CourseRecordsClient, {
    personnelId,
    fileName: file.name,
    fileUrl: null,
    mimeType: file.type || null,
    sizeBytes: file.size || null,
    uploadedBy: getActor(session),
    parserStatus: parsed.status,
    parserSummary: parsed.summary,
    suggestions: parsed.suggestions,
  });

  revalidatePath(`/personell/${personnelId}`);
  return {
    success: true,
    message:
      parsed.suggestions.length > 0
        ? `Dokument lagret med ${parsed.suggestions.length} kursforslag`
        : "Dokument lagret uten kursforslag",
  };
}

export async function approvePersonnelCourseRecord(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };
  await assertUser();

  const id = getFormString(formData, "id");
  const personnelId = getFormString(formData, "personnelId");
  try {
    await approveCourseRecord(db as unknown as CourseRecordsClient, {
      id,
      personnelId,
      actor: getActor(session),
    });
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Kunne ikke godkjenne kurs",
    };
  }

  revalidatePath(`/personell/${personnelId}`);
  return { success: true, message: "Kurs godkjent" };
}

export async function correctPersonnelCourseRecord(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };
  await assertUser();

  const id = getFormString(formData, "id");
  const personnelId = getFormString(formData, "personnelId");
  const name = getFormString(formData, "name");
  const issueDate = getFormStringOptional(formData, "issueDate");
  const expiryDate = getFormStringOptional(formData, "expiryDate");

  if (!name.trim()) return { errors: { name: ["Kursnavn er pakrevd"] } };
  if (!isValidIsoDate(issueDate)) {
    return { errors: { issueDate: ["Bruk datoformat YYYY-MM-DD"] } };
  }
  if (!isValidIsoDate(expiryDate)) {
    return { errors: { expiryDate: ["Bruk datoformat YYYY-MM-DD"] } };
  }

  try {
    await correctAndApproveCourseRecord(db as unknown as CourseRecordsClient, {
      id,
      personnelId,
      actor: getActor(session),
      correction: {
        name,
        issuer: getFormStringOptional(formData, "issuer") ?? null,
        certificateNumber:
          getFormStringOptional(formData, "certificateNumber") ?? null,
        issueDate: issueDate ?? null,
        expiryDate: expiryDate ?? null,
      },
    });
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Kunne ikke korrigere kurs",
    };
  }

  revalidatePath(`/personell/${personnelId}`);
  return { success: true, message: "Kurs korrigert og godkjent" };
}

export async function rejectPersonnelCourseRecord(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };
  await assertUser();

  const id = getFormString(formData, "id");
  const personnelId = getFormString(formData, "personnelId");
  const reason = getFormStringOptional(formData, "reason")?.trim();
  if (!reason) {
    return { errors: { reason: ["Avvisning krever begrunnelse"] } };
  }

  try {
    await rejectCourseRecord(db as unknown as CourseRecordsClient, {
      id,
      personnelId,
      reason,
      actor: getActor(session),
    });
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Kunne ikke avvise kurs",
    };
  }

  revalidatePath(`/personell/${personnelId}`);
  return { success: true, message: "Kursforslag avvist" };
}
