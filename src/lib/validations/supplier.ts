import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  organizationNumber: z.string().optional(),
  type: z.enum(["MATERIAL", "SERVICE", "EQUIPMENT", "RENTAL"], {
    message: "Type er påkrevd",
  }),
  email: z.string().email("Ugyldig e-post").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("Norge"),
  contactPerson: z.string().optional(),
  website: z.string().url("Ugyldig URL").optional().or(z.literal("")),
  notes: z.string().optional(),
  customerId: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  id: z.string(),
});

export const approveSupplierSchema = z.object({
  id: z.string(),
  status: z.enum(["APPROVED", "CONDITIONAL", "REJECTED"]),
  expiresAt: z.string().optional(), // ISO date string
  notes: z.string().optional(),
});

export const supplierReviewSchema = z.object({
  supplierId: z.string(),
  reviewDate: z.string().min(1, "Dato er påkrevd"),
  nextReviewDate: z.string().optional(),
  outcome: z.enum(["APPROVED", "CONDITIONAL", "REJECTED", "EXPIRED"]),
  summary: z.string().optional(),
});

export const supplierEvaluationSchema = z.object({
  supplierId: z.string(),
  projectId: z.string().optional(),
  period: z.string().optional(),
  qualityScore: z.number().min(1).max(5),
  deliveryScore: z.number().min(1).max(5),
  priceScore: z.number().min(1).max(5),
  hseScore: z.number().min(1).max(5),
  communicationScore: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ApproveSupplierInput = z.infer<typeof approveSupplierSchema>;
export type SupplierReviewInput = z.infer<typeof supplierReviewSchema>;
export type SupplierEvaluationInput = z.infer<typeof supplierEvaluationSchema>;
