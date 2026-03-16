import { z } from "zod/v4";

export const syncTriggerSchema = z.object({
  resource: z.enum(["all", "customers", "projects", "employees", "invoices"]),
});

export const employeeLinkSchema = z.object({
  poEmployeeId: z.string().min(1, "PowerOffice-ansatt er påkrevd"),
  personnelId: z.string().min(1, "Personell er påkrevd"),
});
