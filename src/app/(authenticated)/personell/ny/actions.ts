"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createPersonnelFullSchema,
  createPersonManualSchema,
} from "@/lib/validations/personnel";
import { getFormString, getFormStringOptional } from "@/lib/utils";
import { createCandidateWithPersonnel } from "@/lib/personell/create-candidate";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

export async function createPersonnel(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const raw = {
    name: getFormString(formData, "name"),
    role: getFormString(formData, "role"),
    email: getFormStringOptional(formData, "email"),
    phone: getFormStringOptional(formData, "phone"),
    department: getFormStringOptional(formData, "department"),
  };

  const parsed = createPersonnelFullSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const personnel = await db.personnel.create({ data: parsed.data });

  revalidatePath("/personell");
  redirect(`/personell/${personnel.id}`);
}

function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createPersonManual(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = createPersonManualSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await createCandidateWithPersonnel({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email || undefined,
    phone: data.phone || undefined,
    mobilePhone: data.mobilePhone || undefined,
    title: data.title || undefined,
    address: data.address || undefined,
    postalCode: data.postalCode || undefined,
    postalPlace: data.postalPlace || undefined,
    city: data.city || undefined,
    country: data.country || undefined,
    nationality: data.nationality || undefined,
    gender: data.gender || undefined,
    dob: data.dob || undefined,
    rating: data.rating,
    isContractor: data.isContractor,
    company: data.company || undefined,
    linkedIn: data.linkedIn || undefined,
    skills: splitCsv(data.skills),
    courses: splitCsv(data.courses),
    driversLicense: splitCsv(data.driversLicense),
    languages: splitCsv(data.languages),
  });

  revalidatePath("/personell");
  revalidatePath("/personell/innleide");
  revalidatePath("/personell/kandidater");
  return { success: true, message: "Person opprettet" };
}
