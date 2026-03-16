import { z } from "zod";

export const createPersonnelFullSchema = z.object({
  name: z.string().min(2, "Navn må ha minst 2 tegn"),
  role: z.string().min(2, "Rolle må ha minst 2 tegn"),
  email: z.string().email("Ugyldig e-postadresse").optional().or(z.literal("")),
  phone: z.string().optional(),
  department: z.string().optional(),
  rig: z.string().optional(),
});

export const updatePersonnelSchema = createPersonnelFullSchema.partial().extend({
  id: z.string(),
});

export type CreatePersonnelFullInput = z.infer<typeof createPersonnelFullSchema>;
export type UpdatePersonnelInput = z.infer<typeof updatePersonnelSchema>;
