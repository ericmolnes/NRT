"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recmanPost, getCandidateById } from "@/lib/recman/client";
import { CANDIDATE_BASIC_FIELDS } from "@/lib/recman/types";
import {
  candidateCreateSchema,
  candidateUpdateSchema,
  candidateAttributeSchema,
} from "@/lib/validations/candidate";
import { revalidatePath } from "next/cache";

const CORPORATION_ID = () => process.env.RECMAN_CORPORATION_ID || "2484";

// ─── Update candidate ──────────────────────────────────────────────

export async function updateCandidate(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");

  const raw = Object.fromEntries(formData.entries());

  // Convert rating to number if present
  if (raw.rating) raw.rating = Number(raw.rating) as unknown as string;

  const parsed = candidateUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { candidateId, ...data } = parsed.data;

  // Find local candidate to get recmanId
  const local = await db.recmanCandidate.findFirst({
    where: { id: candidateId },
    select: { recmanId: true },
  });
  if (!local) return { success: false as const, errors: { candidateId: ["Kandidat ikke funnet"] } };

  // Push to RecMan
  const result = await recmanPost("candidate", "update", {
    candidateId: local.recmanId,
    ...data,
  });

  if (!result.success) {
    console.error("[RecMan write-back] update failed:", result);
    return {
      success: false as const,
      errors: { _form: ["Kunne ikke oppdatere i RecMan. Prøv igjen."] },
    };
  }

  // Verify by reading back from RecMan
  const verified = await getCandidateById(local.recmanId, CANDIDATE_BASIC_FIELDS);

  // Update local DB
  const updateData: Record<string, unknown> = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.title !== undefined) updateData.title = data.title || null;
  if (data.city !== undefined) updateData.city = data.city || null;
  if (data.country !== undefined) updateData.country = data.country || null;
  if (data.nationality !== undefined) updateData.nationality = data.nationality || null;
  if (data.gender !== undefined) updateData.gender = data.gender || null;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.rating !== undefined) updateData.rating = data.rating;
  if (data.dob !== undefined) updateData.dob = data.dob ? new Date(data.dob) : null;

  // Prefer verified data from RecMan if available
  if (verified) {
    updateData.firstName = verified.firstName;
    updateData.lastName = verified.lastName;
    updateData.email = verified.email || null;
    updateData.title = verified.title || null;
    updateData.city = verified.city || null;
  }

  await db.recmanCandidate.update({
    where: { id: candidateId },
    data: updateData,
  });

  console.log(`[RecMan write-back] updated candidate ${local.recmanId}`);

  revalidatePath("/personell/kandidater");
  return { success: true as const };
}

// ─── Create candidate ──────────────────────────────────────────────

export async function createCandidate(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");

  const raw = Object.fromEntries(formData.entries());
  if (raw.rating) raw.rating = Number(raw.rating) as unknown as string;

  const parsed = candidateCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  // Push to RecMan
  const result = await recmanPost("candidate", "insert", {
    corporationId: CORPORATION_ID(),
    ...parsed.data,
  });

  if (!result.success) {
    console.error("[RecMan write-back] insert failed:", result);
    return {
      success: false as const,
      errors: { _form: ["Kunne ikke opprette i RecMan. Prøv igjen."] },
    };
  }

  const newRecmanId = result.candidateId;
  if (!newRecmanId) {
    return {
      success: false as const,
      errors: { _form: ["RecMan returnerte ingen kandidat-ID."] },
    };
  }

  // Verify by reading back from RecMan
  const verified = await getCandidateById(String(newRecmanId), CANDIDATE_BASIC_FIELDS);

  // Create local record
  const candidate = await db.recmanCandidate.create({
    data: {
      recmanId: String(newRecmanId),
      firstName: verified?.firstName || parsed.data.firstName,
      lastName: verified?.lastName || parsed.data.lastName,
      email: verified?.email || parsed.data.email || null,
      phone: parsed.data.phone || parsed.data.mobilePhone || null,
      title: verified?.title || parsed.data.title || null,
      city: verified?.city || parsed.data.city || null,
      country: parsed.data.country || null,
      nationality: parsed.data.nationality || null,
      gender: parsed.data.gender || null,
      dob: parsed.data.dob ? new Date(parsed.data.dob) : null,
      description: parsed.data.description || null,
      rating: parsed.data.rating || 0,
      isEmployee: false,
      skills: [],
      education: [],
      experience: [],
      courses: [],
      languages: [],
      references: [],
      attributes: [],
      driversLicense: [],
      lastSyncedAt: new Date(),
    },
  });

  console.log(`[RecMan write-back] created candidate ${newRecmanId} → local ${candidate.id}`);

  revalidatePath("/personell/kandidater");
  return { success: true as const, candidateId: candidate.id };
}

// ─── Update candidate attributes ───────────────────────────────────

export async function updateCandidateAttributes(
  candidateId: string,
  attributes: Array<{ attributeId: number; checkbox: Array<{ checkboxId: number }> }>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");

  const parsed = candidateAttributeSchema.safeParse({ candidateId, attributes });
  if (!parsed.success) {
    return { success: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const local = await db.recmanCandidate.findFirst({
    where: { id: candidateId },
    select: { recmanId: true },
  });
  if (!local) return { success: false as const, errors: { candidateId: ["Kandidat ikke funnet"] } };

  const result = await recmanPost("candidateAttribute", "insert", {
    candidateId: local.recmanId,
    attributes,
  });

  if (!result.success) {
    console.error("[RecMan write-back] attribute update failed:", result);
    return {
      success: false as const,
      errors: { _form: ["Kunne ikke oppdatere attributter i RecMan."] },
    };
  }

  console.log(`[RecMan write-back] updated attributes for candidate ${local.recmanId}`);

  revalidatePath("/personell/kandidater");
  return { success: true as const };
}

// ─── Toggle innleid-status ─────────────────────────────────────────

export async function toggleContractor(candidateId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");

  const candidate = await db.recmanCandidate.findUnique({
    where: { id: candidateId },
    select: { isContractor: true },
  });
  if (!candidate) return { success: false as const, error: "Kandidat ikke funnet" };

  await db.recmanCandidate.update({
    where: { id: candidateId },
    data: { isContractor: !candidate.isContractor },
  });

  console.log(`[NRT] toggled contractor status for ${candidateId} → ${!candidate.isContractor}`);

  revalidatePath("/personell/kandidater");
  revalidatePath("/personell");
  return { success: true as const, isContractor: !candidate.isContractor };
}

// ─── Fjern ansettelse (sett employeeEnd til i dag) ─────────────────

export async function removeEmployment(candidateId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autentisert");

  const candidate = await db.recmanCandidate.findUnique({
    where: { id: candidateId },
    select: { recmanId: true, isEmployee: true },
  });
  if (!candidate) return { success: false as const, error: "Kandidat ikke funnet" };
  if (!candidate.isEmployee) return { success: false as const, error: "Er ikke registrert som ansatt" };

  // Set employeeEnd locally
  await db.recmanCandidate.update({
    where: { id: candidateId },
    data: { employeeEnd: new Date() },
  });

  console.log(`[NRT] removed employment for candidate ${candidateId}`);

  revalidatePath("/personell/kandidater");
  revalidatePath("/personell");
  return { success: true as const };
}
