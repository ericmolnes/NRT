import { z } from "zod";

export const segmentSchema = z.object({
  type: z.enum(["WORK", "OFF", "VACATION", "AVSPASERING", "COURSE"]),
  days: z.coerce.number().int().min(1, "Minst 1 dag"),
  sortOrder: z.coerce.number().int().default(0),
  label: z.string().optional(),
});

export const createRotationPatternSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  description: z.string().optional(),
  segments: z.array(segmentSchema).min(1, "Minst ett segment"),
});

export const updateRotationPatternSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  segments: z.array(segmentSchema).min(1).optional(),
});

export type SegmentInput = z.infer<typeof segmentSchema>;
export type CreateRotationPatternInput = z.infer<typeof createRotationPatternSchema>;
export type UpdateRotationPatternInput = z.infer<typeof updateRotationPatternSchema>;
