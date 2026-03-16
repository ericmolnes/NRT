"use server";

import { db } from "@/lib/db";
import {
  publicEvaluationSchema,
  publicCustomFieldsSchema,
} from "@/lib/validations/evaluation-link";
import { calculateTotalScore, EVALUATION_CRITERIA } from "@/lib/validations/evaluation";

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

export type PublicActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export async function submitPublicEvaluation(
  _prevState: PublicActionState,
  formData: FormData
): Promise<PublicActionState> {
  const raw: Record<string, unknown> = {
    token: formData.get("token") as string,
    personnelId: formData.get("personnelId") as string,
    evaluatorName: formData.get("evaluatorName") as string,
    comment: (formData.get("comment") as string) || undefined,
  };
  for (const c of EVALUATION_CRITERIA) {
    raw[c.key] = formData.get(c.key);
  }

  const parsed = publicEvaluationSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const link = await db.evaluationLink.findUnique({
    where: { token: parsed.data.token },
  });

  if (!link) {
    return { message: "Ugyldig skjemalink" };
  }

  if (!link.active) {
    return { message: "Dette skjemaet er deaktivert" };
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return { message: "Dette skjemaet har utløpt" };
  }

  // If the link is locked to a person, use that; otherwise use form value
  const personnelId = link.personnelId ?? parsed.data.personnelId;

  // Verify personnel exists
  const personnel = await db.personnel.findUnique({ where: { id: personnelId } });
  if (!personnel) {
    return { message: "Personellet ble ikke funnet" };
  }

  const criteriaValues: Record<string, number> = {};
  for (const c of EVALUATION_CRITERIA) {
    criteriaValues[c.key] = parsed.data[c.key as keyof typeof parsed.data] as number;
  }
  const totalScore = calculateTotalScore(criteriaValues);

  await db.evaluation.create({
    data: {
      personnelId,
      score: totalScore,
      hpiSafety: parsed.data.hpiSafety,
      competence: parsed.data.competence,
      collaboration: parsed.data.collaboration,
      workEthic: parsed.data.workEthic,
      independence: parsed.data.independence,
      punctuality: parsed.data.punctuality,
      comment: parsed.data.comment,
      evaluatorId: "external",
      evaluatorName: parsed.data.evaluatorName,
    },
  });

  await db.evaluationLink.update({
    where: { id: link.id },
    data: { usageCount: { increment: 1 } },
  });

  return { success: true, message: "Takk! Evalueringen er sendt inn." };
}

export async function submitPublicCustomFields(
  _prevState: PublicActionState,
  formData: FormData
): Promise<PublicActionState> {
  const raw = {
    token: formData.get("token") as string,
    personnelId: formData.get("personnelId") as string,
    submitterName: formData.get("submitterName") as string,
  };

  const parsed = publicCustomFieldsSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const link = await db.evaluationLink.findUnique({
    where: { token: parsed.data.token },
    include: {
      category: {
        include: { fields: true },
      },
    },
  });

  if (!link) {
    return { message: "Ugyldig skjemalink" };
  }

  if (!link.active) {
    return { message: "Dette skjemaet er deaktivert" };
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return { message: "Dette skjemaet har utløpt" };
  }

  if (!link.category) {
    return { message: "Skjemaet mangler feltkategori" };
  }

  const personnelId = link.personnelId ?? parsed.data.personnelId;

  const personnel = await db.personnel.findUnique({
    where: { id: personnelId },
  });
  if (!personnel) {
    return { message: "Personellet ble ikke funnet" };
  }

  // Validate required fields and field types
  const errors: Record<string, string[]> = {};
  for (const field of link.category.fields) {
    const value = (formData.get(`field_${field.id}`) as string) ?? "";
    if (field.required && !value) {
      errors[field.id] = [`${field.name} er påkrevd`];
      continue;
    }
    if (value) {
      const typeError = validateFieldType(value, field.type, field.name, field.options);
      if (typeError) {
        errors[field.id] = [typeError];
      }
    }
  }
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  // Upsert field values
  for (const field of link.category.fields) {
    const value = (formData.get(`field_${field.id}`) as string) ?? "";
    if (value) {
      await db.fieldValue.upsert({
        where: {
          personnelId_fieldId: { personnelId, fieldId: field.id },
        },
        create: { personnelId, fieldId: field.id, value },
        update: { value },
      });
    }
  }

  await db.evaluationLink.update({
    where: { id: link.id },
    data: { usageCount: { increment: 1 } },
  });

  return { success: true, message: "Takk! Dataene er registrert." };
}
