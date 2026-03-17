import { z } from "zod";

export const createFormLinkSchema = z
  .object({
    personnelId: z.string().optional(),
    title: z.string().min(1, "Tittel er påkrevd"),
    formType: z.enum(["EVALUATION", "CUSTOM_FIELDS"]),
    authMode: z.enum(["NONE", "PASSWORD", "MICROSOFT"]).default("NONE"),
    password: z.string().optional(),
    categoryId: z.string().optional(),
    expiresAt: z.string().optional(),
  })
  .refine(
    (d) => d.formType !== "CUSTOM_FIELDS" || (d.categoryId && d.categoryId.length > 0),
    { message: "Velg en feltkategori", path: ["categoryId"] }
  )
  .refine(
    (d) => d.authMode !== "PASSWORD" || (d.password && d.password.length >= 4),
    { message: "Passord må være minst 4 tegn", path: ["password"] }
  );

// Keep old name as alias for backward compat
export const createEvaluationLinkSchema = createFormLinkSchema;

export const publicEvaluationSchema = z.object({
  token: z.string(),
  personnelId: z.string().min(1, "Velg personell"),
  evaluatorName: z.string().min(2, "Oppgi ditt navn (minst 2 tegn)"),
  hpiSafety: z.coerce.number().int().min(1).max(10),
  competence: z.coerce.number().int().min(1).max(10),
  collaboration: z.coerce.number().int().min(1).max(10),
  workEthic: z.coerce.number().int().min(1).max(10),
  independence: z.coerce.number().int().min(1).max(10),
  punctuality: z.coerce.number().int().min(1).max(10),
  comment: z.string().max(2000).optional(),
});

export const publicCustomFieldsSchema = z.object({
  token: z.string(),
  personnelId: z.string().min(1, "Velg personell"),
  submitterName: z.string().min(2, "Oppgi ditt navn (minst 2 tegn)"),
  // Field values are dynamic — validated per field in the action
});

export type CreateFormLinkInput = z.infer<typeof createFormLinkSchema>;
export type CreateEvaluationLinkInput = CreateFormLinkInput;
export type PublicEvaluationInput = z.infer<typeof publicEvaluationSchema>;
export type PublicCustomFieldsInput = z.infer<typeof publicCustomFieldsSchema>;
