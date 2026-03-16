import { db } from "@/lib/db";

export async function getActiveRateProfiles() {
  return db.rateProfile.findMany({
    where: { active: true },
    include: { rates: { orderBy: { roleCode: "asc" } } },
    orderBy: { name: "asc" },
  });
}

export async function getRateProfileById(id: string) {
  return db.rateProfile.findUnique({
    where: { id },
    include: { rates: { orderBy: { roleCode: "asc" } } },
  });
}

export async function getDefaultRateProfile() {
  return db.rateProfile.findFirst({
    where: { active: true },
    include: { rates: true },
    orderBy: { createdAt: "asc" },
  });
}
