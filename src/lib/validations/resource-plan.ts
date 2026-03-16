import { z } from "zod";

export const createResourcePlanSchema = z.object({
  year: z.coerce.number().int().min(2024).max(2030),
  name: z.string().min(1, "Navn er påkrevd"),
});

export const createEntrySchema = z.object({
  resourcePlanId: z.string(),
  personnelId: z.string().optional(),
  displayName: z.string().min(1, "Navn er påkrevd"),
  crew: z.string().optional(),
  location: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateEntrySchema = createEntrySchema.partial().extend({
  id: z.string(),
});

export const bulkSetAllocationsSchema = z.object({
  entryIds: z.array(z.string()).min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  label: z.string().min(1, "Label er påkrevd"),
});

export const clearAllocationsSchema = z.object({
  entryIds: z.array(z.string()).min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const createLabelSchema = z.object({
  resourcePlanId: z.string(),
  name: z.string().min(1, "Navn er påkrevd"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Ugyldig fargekode"),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  category: z.enum(["client", "status", "internal"]).default("client"),
});

export const updateLabelSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  category: z.enum(["client", "status", "internal"]).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CreateResourcePlanInput = z.infer<typeof createResourcePlanSchema>;
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type BulkSetAllocationsInput = z.infer<typeof bulkSetAllocationsSchema>;
export type ClearAllocationsInput = z.infer<typeof clearAllocationsSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
