import { z } from "zod";

export const candidateCreateSchema = z.object({
  firstName: z.string().min(1, "Fornavn er påkrevd"),
  lastName: z.string().min(1, "Etternavn er påkrevd"),
  email: z.string().email("Ugyldig e-post").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  title: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  postalPlace: z.string().optional(),
  country: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.enum(["male", "female", ""]).optional(),
  dob: z.string().optional(), // ISO date string
  description: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
});

export const candidateUpdateSchema = candidateCreateSchema.partial().extend({
  candidateId: z.string().min(1, "Kandidat-ID er påkrevd"),
});

export const candidateAttributeSchema = z.object({
  candidateId: z.string().min(1),
  attributes: z.array(
    z.object({
      attributeId: z.number(),
      checkbox: z.array(z.object({ checkboxId: z.number() })),
    })
  ),
});
