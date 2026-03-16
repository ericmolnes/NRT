import { z } from "zod";

export const createNoteSchema = z.object({
  content: z.string().min(1, "Notat kan ikke være tomt"),
  personnelId: z.string(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
