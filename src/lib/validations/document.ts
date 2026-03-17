import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd"),
  category: z.enum([
    "PROCEDURE",
    "WORK_INSTRUCTION",
    "FORM_TEMPLATE",
    "POLICY",
    "RECORD",
    "EXTERNAL",
  ], { message: "Kategori er påkrevd" }),
  responsibleName: z.string().min(1, "Ansvarlig er påkrevd"),
  reviewCycleMonths: z.number().min(1).max(120).optional(),
});

export const updateDocumentSchema = createDocumentSchema.partial().extend({
  id: z.string(),
});

export const createVersionSchema = z.object({
  documentId: z.string(),
  changeDescription: z.string().optional(),
  fileName: z.string().optional(),
  fileUrl: z.string().optional(),
});

export const approveVersionSchema = z.object({
  id: z.string(),
  action: z.enum(["APPROVE", "REJECT", "OBSOLETE"]),
});

export const linkSupplierSchema = z.object({
  documentId: z.string(),
  supplierId: z.string(),
  description: z.string().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type ApproveVersionInput = z.infer<typeof approveVersionSchema>;
