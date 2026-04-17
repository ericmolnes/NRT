import { z } from "zod";

export const createPersonnelFullSchema = z.object({
  name: z.string().min(2, "Navn må ha minst 2 tegn"),
  role: z.string().min(2, "Rolle må ha minst 2 tegn"),
  email: z.string().email("Ugyldig e-postadresse").optional().or(z.literal("")),
  phone: z.string().optional(),
  department: z.string().optional(),
});

export const updatePersonnelSchema = createPersonnelFullSchema.partial().extend({
  id: z.string(),
});

export const createPersonManualSchema = z.object({
  firstName: z.string().min(1, "Fornavn er påkrevd"),
  lastName: z.string().min(1, "Etternavn er påkrevd"),
  email: z.string().email("Ugyldig e-postadresse").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  title: z.string().optional(),
  isContractor: z.coerce.boolean(),
  company: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  postalPlace: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  rating: z.coerce.number().int().min(0).max(5).optional(),
  linkedIn: z.string().url("Ugyldig URL").optional().or(z.literal("")),
  skills: z.string().optional(),
  courses: z.string().optional(),
  driversLicense: z.string().optional(),
  languages: z.string().optional(),
});

export type CreatePersonnelFullInput = z.infer<typeof createPersonnelFullSchema>;
export type UpdatePersonnelInput = z.infer<typeof updatePersonnelSchema>;
export type CreatePersonManualInput = z.infer<typeof createPersonManualSchema>;
