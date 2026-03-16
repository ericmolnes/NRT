"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCanModify } from "@/lib/rbac";
import { createCustomerSchema, updateCustomerSchema, createContactSchema } from "@/lib/validations/customer";
import { createCustomer as createPOCustomer, updateCustomer as updatePOCustomer } from "@/lib/poweroffice/resources";
import { revalidatePath } from "next/cache";

export type ActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
  id?: string;
};

export async function createCustomer(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createCustomerSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { syncToPowerOffice, ...customerData } = parsed.data;

  const customer = await db.customer.create({
    data: {
      ...customerData,
      poSyncStatus: syncToPowerOffice ? "PENDING_PUSH" : "NOT_SYNCED",
      createdById: session.user.id,
      createdByName: session.user.name ?? "Ukjent",
    },
  });

  // Push til PowerOffice
  if (syncToPowerOffice) {
    try {
      const poResult = await createPOCustomer({
        name: customer.name,
        organizationNumber: customer.organizationNumber ?? undefined,
        emailAddress: customer.emailAddress ?? undefined,
        phoneNumber: customer.phoneNumber ?? undefined,
      });

      const poCustomer = await db.pOCustomer.create({
        data: {
          poId: BigInt(poResult.id),
          name: poResult.name ?? customer.name,
          organizationNumber: poResult.organizationNumber,
          emailAddress: poResult.emailAddress,
          phoneNumber: poResult.phoneNumber,
          rawJson: JSON.stringify(poResult),
        },
      });

      await db.customer.update({
        where: { id: customer.id },
        data: { poCustomerId: poCustomer.id, poSyncStatus: "SYNCED" },
      });
    } catch (e) {
      console.error("PowerOffice push failed:", e);
      await db.customer.update({
        where: { id: customer.id },
        data: { poSyncStatus: "PUSH_FAILED" },
      });
    }
  }

  revalidatePath("/kunder");
  return { success: true, message: "Kunde opprettet", id: customer.id };
}

export async function updateCustomer(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = updateCustomerSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { id, syncToPowerOffice, ...updateData } = parsed.data;

  const resource = await db.customer.findUniqueOrThrow({ where: { id }, select: { createdById: true } });
  await assertCanModify(resource);

  await db.customer.update({ where: { id }, data: updateData });

  // Oppdater PowerOffice hvis koblet
  const customer = await db.customer.findUnique({
    where: { id },
    include: { poCustomer: true },
  });
  if (customer?.poCustomer) {
    try {
      await updatePOCustomer(Number(customer.poCustomer.poId), {
        name: customer.name,
        organizationNumber: customer.organizationNumber ?? undefined,
        emailAddress: customer.emailAddress ?? undefined,
        phoneNumber: customer.phoneNumber ?? undefined,
      });
      await db.customer.update({ where: { id }, data: { poSyncStatus: "SYNCED" } });
    } catch {
      await db.customer.update({ where: { id }, data: { poSyncStatus: "PUSH_FAILED" } });
    }
  }

  revalidatePath(`/kunder/${id}`);
  return { success: true, message: "Kunde oppdatert" };
}

export async function addContact(
  data: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const parsed = createContactSchema.safeParse(data);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await db.customerContact.create({ data: parsed.data });

  revalidatePath(`/kunder/${parsed.data.customerId}`);
  return { success: true, message: "Kontaktperson lagt til" };
}

export async function deleteContact(id: string, customerId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { message: "Ikke autentisert" };

  const resource = await db.customer.findUniqueOrThrow({ where: { id: customerId }, select: { createdById: true } });
  await assertCanModify(resource);

  await db.customerContact.delete({ where: { id } });
  revalidatePath(`/kunder/${customerId}`);
  return { success: true, message: "Kontaktperson fjernet" };
}

export async function deleteCustomer(customerId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autentisert");

  const customer = await db.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { createdById: true },
  });
  await assertCanModify(customer);

  await db.customer.update({
    where: { id: customerId },
    data: { isActive: false },
  });
  revalidatePath("/kunder");
}
