"use server";

import { revalidatePath } from "next/cache";

import {
  transitionCategory,
  type TransitionResult,
} from "@/lib/personell/transition-category";
import type { PersonnelCategory } from "@/lib/personell/category";

// ─── Eksplisitt kategori-overgang (server action) ─────────────────
//
// Wrapper rundt `transitionCategory` som revaliderer alle relevante sider.
// Brukes fra UI-komponenter slik at kalleren eksplisitt sier hvilken
// kategori personen skal flyttes til ("INNLEID", "KANDIDAT", "ANSATT").
//
// Erstatter de tidligere shim-aksjonene `toggleContractor`,
// `toggleContractorWithHistory` og `removeContractorStatus` — beslutningen
// om hvilken kategori skal være target ligger nå hos kalleren, ikke skjult
// i en shim.

export async function transitionPersonnelCategory(
  ref: { personnelId?: string; recmanCandidateId?: string },
  to: PersonnelCategory,
  options: { company?: string | null; notes?: string | null } = {}
): Promise<TransitionResult> {
  const result = await transitionCategory(ref, to, options);

  if (result.success) {
    revalidatePath("/personell");
    revalidatePath("/personell/innleide");
    revalidatePath("/personell/kandidater");
  }

  return result;
}
