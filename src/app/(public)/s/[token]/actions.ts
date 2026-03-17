"use server";

import { db } from "@/lib/db";
import {
  publicEvaluationSchema,
  publicCustomFieldsSchema,
} from "@/lib/validations/evaluation-link";
import { EVALUATION_CRITERIA, type Criterion } from "@/lib/validations/evaluation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

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
  const token = formData.get("token") as string;
  const personnelIdRaw = formData.get("personnelId") as string;
  const evaluatorName = formData.get("evaluatorName") as string;
  const comment = (formData.get("comment") as string) || undefined;

  if (!token) return { message: "Mangler token" };
  if (!evaluatorName || evaluatorName.length < 2) {
    return { errors: { evaluatorName: ["Oppgi ditt navn (minst 2 tegn)"] } };
  }

  const link = await db.evaluationLink.findUnique({
    where: { token },
  });

  if (!link) return { message: "Ugyldig skjemalink" };
  if (!link.active) return { message: "Dette skjemaet er deaktivert" };
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return { message: "Dette skjemaet har utløpt" };
  }

  // Server-side auth enforcement for Microsoft mode
  if (link.authMode === "MICROSOFT") {
    const session = await auth();
    if (!session?.user) {
      return { message: "Du må logge inn med Microsoft for å sende inn dette skjemaet" };
    }
  }

  const personnelId = link.personnelId ?? personnelIdRaw;
  if (!personnelId) {
    return { errors: { personnelId: ["Velg personell"] } };
  }

  const personnel = await db.personnel.findUnique({ where: { id: personnelId } });
  if (!personnel) return { message: "Personellet ble ikke funnet" };

  // Determine which criteria to use
  const customCriteria = link.criteria as Criterion[] | null;
  const activeCriteria = customCriteria ?? EVALUATION_CRITERIA;

  // Extract and validate scores (supports sub-criteria with parent.child keys)
  // criteriaScores stores ALL scores: sub-scores as "parent.child" and parent averages as "parent"
  const criteriaScores: Record<string, number> = {};
  const errors: Record<string, string[]> = {};

  for (const c of activeCriteria) {
    const children = (c as Criterion).children;
    if (children && children.length > 0) {
      // Has sub-criteria: collect each child score, then average into parent
      const childScores: number[] = [];
      for (const sub of children) {
        const formKey = `${c.key}.${sub.key}`;
        const val = Number(formData.get(formKey));
        if (!val || val < 1 || val > 10 || !Number.isInteger(val)) {
          errors[formKey] = [`${sub.label} må ha en score mellom 1 og 10`];
        } else {
          criteriaScores[formKey] = val;
          childScores.push(val);
        }
      }
      // Parent score = average of children (rounded)
      if (childScores.length > 0) {
        criteriaScores[c.key] = Math.round(
          childScores.reduce((a, b) => a + b, 0) / childScores.length
        );
      }
    } else {
      // Single score
      const val = Number(formData.get(c.key));
      if (!val || val < 1 || val > 10 || !Number.isInteger(val)) {
        errors[c.key] = [`${c.label} må ha en score mellom 1 og 10`];
      } else {
        criteriaScores[c.key] = val;
      }
    }
  }

  if (Object.keys(errors).length > 0) return { errors };

  // Total score = average of parent-level scores only
  const parentScores = activeCriteria
    .map((c) => criteriaScores[c.key])
    .filter((v): v is number => v != null);
  const totalScore = Math.round(
    parentScores.reduce((a, b) => a + b, 0) / parentScores.length
  );

  // Microsoft metadata
  const microsoftEmail = formData.get("microsoftEmail") as string | null;
  const microsoftName = formData.get("microsoftName") as string | null;
  const microsoftEntraId = formData.get("microsoftEntraId") as string | null;

  // Get request metadata
  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    null;
  const userAgent = headersList.get("user-agent") || null;

  // Build evaluation data — use fixed fields for default criteria, JSON for custom
  const evalData: Record<string, unknown> = {
    personnelId,
    score: totalScore,
    comment,
    evaluatorId: microsoftEntraId || "external",
    evaluatorName,
  };

  if (customCriteria) {
    // Custom criteria: store all scores as JSON
    evalData.criteriaScores = criteriaScores;
  } else {
    // Default criteria: store in fixed columns for backward compat
    evalData.hpiSafety = criteriaScores.hpiSafety ?? 5;
    evalData.competence = criteriaScores.competence ?? 5;
    evalData.collaboration = criteriaScores.collaboration ?? 5;
    evalData.workEthic = criteriaScores.workEthic ?? 5;
    evalData.independence = criteriaScores.independence ?? 5;
    evalData.punctuality = criteriaScores.punctuality ?? 5;
  }

  const evaluation = await db.evaluation.create({
    data: evalData as Parameters<typeof db.evaluation.create>[0]["data"],
  });

  // Create form submission metadata and update usage count in parallel
  await Promise.all([
    db.formSubmission.create({
      data: {
        evaluationLinkId: link.id,
        evaluationId: evaluation.id,
        authMethod: link.authMode,
        microsoftEmail,
        microsoftName,
        microsoftEntraId,
        ipAddress,
        userAgent,
      },
    }),
    db.evaluationLink.update({
      where: { id: link.id },
      data: { usageCount: { increment: 1 } },
    }),
  ]);

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

  // Upsert field values in parallel
  await Promise.all(
    link.category.fields
      .filter((field) => {
        const value = (formData.get(`field_${field.id}`) as string) ?? "";
        return !!value;
      })
      .map((field) => {
        const value = (formData.get(`field_${field.id}`) as string) ?? "";
        return db.fieldValue.upsert({
          where: {
            personnelId_fieldId: { personnelId, fieldId: field.id },
          },
          create: { personnelId, fieldId: field.id, value },
          update: { value },
        });
      })
  );

  // Get request metadata for submission tracking
  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    null;
  const userAgent = headersList.get("user-agent") || null;

  // Create form submission and update usage count in parallel
  await Promise.all([
    db.formSubmission.create({
      data: {
        evaluationLinkId: link.id,
        authMethod: link.authMode,
        ipAddress,
        userAgent,
      },
    }),
    db.evaluationLink.update({
      where: { id: link.id },
      data: { usageCount: { increment: 1 } },
    }),
  ]);

  return { success: true, message: "Takk! Dataene er registrert." };
}
