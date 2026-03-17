import { z } from "zod";

export const createNCSchema = z.object({
  supplierId: z.string(),
  title: z.string().min(1, "Tittel er påkrevd"),
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  severity: z.number().min(1).max(3).default(1),
  detectedDate: z.string().optional(),
});

export const createCAPASchema = z.object({
  nonConformanceId: z.string(),
  type: z.enum(["CORRECTIVE", "PREVENTIVE"]),
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  responsibleName: z.string().min(1, "Ansvarlig er påkrevd"),
  dueDate: z.string().min(1, "Frist er påkrevd"),
});

export const updateCAPASchema = z.object({
  id: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "VERIFIED", "CLOSED"]).optional(),
  completedDate: z.string().optional(),
  evidence: z.string().optional(),
});

export type CreateNCInput = z.infer<typeof createNCSchema>;
export type CreateCAPAInput = z.infer<typeof createCAPASchema>;
export type UpdateCAPAInput = z.infer<typeof updateCAPASchema>;
