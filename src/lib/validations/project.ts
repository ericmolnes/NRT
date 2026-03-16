import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  code: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  customerId: z.string(),
  syncToPowerOffice: z.boolean().default(true),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.string(),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
