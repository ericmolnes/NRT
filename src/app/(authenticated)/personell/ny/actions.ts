"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPersonnelFullSchema } from "@/lib/validations/personnel";
import { getFormString, getFormStringOptional } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
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
    rig: getFormStringOptional(formData, "rig"),
  };

  const parsed = createPersonnelFullSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const personnel = await db.personnel.create({ data: parsed.data });

  revalidatePath("/personell");
  redirect(`/personell/${personnel.id}`);
}
