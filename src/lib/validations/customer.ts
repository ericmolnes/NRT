import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  organizationNumber: z.string().optional(),
  emailAddress: z.string().email("Ugyldig e-post").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("Norge"),
  industry: z.string().optional(),
  notes: z.string().optional(),
  syncToPowerOffice: z.boolean().default(true),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  id: z.string(),
});

export const createContactSchema = z.object({
  customerId: z.string(),
  name: z.string().min(1, "Navn er påkrevd"),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
