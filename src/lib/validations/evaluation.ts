import { z } from "zod";

const scoreField = z.coerce
  .number()
  .int()
  .min(1, "Score må være mellom 1 og 10")
  .max(10, "Score må være mellom 1 og 10");

export const createPersonnelSchema = z.object({
  name: z.string().min(2, "Navn må ha minst 2 tegn"),
  role: z.string().min(2, "Rolle må ha minst 2 tegn"),
  rig: z.string().optional(),
});

export const createEvaluationSchema = z.object({
  personnelId: z.string().optional(),
  newPersonnel: createPersonnelSchema.optional(),
  hpiSafety: scoreField,
  competence: scoreField,
  collaboration: scoreField,
  workEthic: scoreField,
  independence: scoreField,
  punctuality: scoreField,
  comment: z
    .string()
    .max(2000, "Kommentar kan ikke overstige 2000 tegn")
    .optional(),
}).refine(
  (data) => data.personnelId || data.newPersonnel,
  { message: "Velg personell eller opprett nytt", path: ["personnelId"] }
);

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;

/** Evalueringskriterier med norske labels */
export const EVALUATION_CRITERIA = [
  { key: "hpiSafety", label: "HMS / Sikkerhet", description: "Følger sikkerhetsrutiner, bruker verneutstyr, rapporterer avvik" },
  { key: "competence", label: "Fagkompetanse", description: "Teknisk kunnskap og ferdigheter i sin rolle" },
  { key: "collaboration", label: "Samarbeid", description: "Jobber godt med kolleger, kommuniserer tydelig" },
  { key: "workEthic", label: "Arbeidsinnsats", description: "Motivasjon, initiativ, pålitelighet" },
  { key: "independence", label: "Selvstendighet", description: "Evne til å jobbe selvstendig og ta beslutninger" },
  { key: "punctuality", label: "Punktlighet", description: "Møter opp i tide, overholder tidsfrister" },
] as const;

/** Shared criterion type for evaluation forms */
export interface Criterion {
  key: string;
  label: string;
  description: string;
  children?: Criterion[];
}

/** Default criteria with children support */
export const DEFAULT_CRITERIA: Criterion[] = EVALUATION_CRITERIA.map((c) => ({
  key: c.key,
  label: c.label,
  description: c.description,
  children: [],
}));

/** Beregn totalsnitt fra kriterieverdier */
export function calculateTotalScore(criteria: Record<string, number>): number {
  const values = EVALUATION_CRITERIA.map((c) => criteria[c.key] ?? 0);
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}
