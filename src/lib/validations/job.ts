import { z } from "zod";

export const createJobSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  description: z.string().optional(),
  type: z.enum(["TIME_LIMITED", "ONGOING"]),
  location: z.string().min(1, "Lokasjon er påkrevd"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  projectId: z.string(),
  rotationPatternId: z.string().optional(),
  resourcePlanLabelName: z.string().optional(),
});

export const updateJobSchema = createJobSchema.partial().extend({
  id: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
});

export const assignPersonnelSchema = z.object({
  jobId: z.string(),
  personnelIds: z.array(z.string()).min(1, "Velg minst én person"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  rotationPatternId: z.string().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type AssignPersonnelInput = z.infer<typeof assignPersonnelSchema>;
