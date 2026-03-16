import { db } from "@/lib/db";

/**
 * Find an existing Personnel record matching the given identity.
 * Matches by email (primary) or full name (secondary).
 */
export async function findMatchingPersonnel(
  email: string | null | undefined,
  firstName: string,
  lastName: string
): Promise<{ id: string } | null> {
  // Primary: match by email (most reliable)
  if (email) {
    const byEmail = await db.personnel.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (byEmail) return byEmail;
  }

  // Secondary: match by full name
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    const byName = await db.personnel.findFirst({
      where: { name: { equals: fullName, mode: "insensitive" } },
      select: { id: true },
    });
    if (byName) return byName;
  }

  return null;
}

/**
 * Find an existing Personnel record or create a new one.
 * Returns the personnelId.
 */
export async function findOrCreatePersonnel(data: {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  role?: string | null;
}): Promise<string> {
  const match = await findMatchingPersonnel(
    data.email,
    data.firstName,
    data.lastName
  );

  if (match) return match.id;

  // Create new Personnel record
  const personnel = await db.personnel.create({
    data: {
      name: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email || undefined,
      phone: data.phone || undefined,
      department: data.department || undefined,
      role: data.role || "Ansatt",
      status: "ACTIVE",
    },
  });

  return personnel.id;
}

/**
 * Enrich an existing Personnel record with data from external sources.
 * Only fills in empty fields — never overwrites user-set values.
 */
export async function enrichPersonnel(
  personnelId: string,
  data: {
    phone?: string | null;
    department?: string | null;
  }
): Promise<void> {
  const personnel = await db.personnel.findUnique({
    where: { id: personnelId },
    select: { phone: true, department: true },
  });
  if (!personnel) return;

  const updates: Record<string, string> = {};
  if (!personnel.phone && data.phone) updates.phone = data.phone;
  if (!personnel.department && data.department)
    updates.department = data.department;

  if (Object.keys(updates).length > 0) {
    await db.personnel.update({ where: { id: personnelId }, data: updates });
  }
}
