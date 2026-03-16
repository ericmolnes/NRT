import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Kategorinavn er påkrevd"),
  order: z.coerce.number().int().min(0).default(0),
});

export const createFieldDefinitionSchema = z.object({
  name: z.string().min(1, "Feltnavn er påkrevd"),
  type: z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "BOOLEAN", "TEXTAREA"]),
  options: z.string().optional(),
  required: z.coerce.boolean().default(false),
  order: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().min(1, "Kategori er påkrevd"),
});

export const saveFieldValuesSchema = z.object({
  personnelId: z.string(),
  values: z.array(
    z.object({
      fieldId: z.string(),
      value: z.string(),
    })
  ),
});

export const updateFieldDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Feltnavn er påkrevd"),
  type: z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "BOOLEAN", "TEXTAREA"]),
  options: z.string().optional(),
  required: z.coerce.boolean().default(false),
  order: z.coerce.number().int().min(0).default(0),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateFieldDefinitionInput = z.infer<typeof createFieldDefinitionSchema>;
export type UpdateFieldDefinitionInput = z.infer<typeof updateFieldDefinitionSchema>;
export type SaveFieldValuesInput = z.infer<typeof saveFieldValuesSchema>;
