import { db } from "@/lib/db";

export async function getCustomerList(search?: string, type?: string) {
  return db.customer.findMany({
    where: {
      isActive: true,
      ...(search && { name: { contains: search, mode: "insensitive" as const } }),
      ...(type && { recmanCompanyType: type }),
    },
    select: {
      id: true,
      name: true,
      organizationNumber: true,
      emailAddress: true,
      phoneNumber: true,
      poSyncStatus: true,
      poCustomerId: true,
      recmanCompanyId: true,
      recmanCompanyType: true,
      contacts: { where: { isPrimary: true }, take: 1 },
      _count: { select: { projects: true, contacts: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getCustomerById(id: string) {
  return db.customer.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      projects: {
        include: {
          _count: { select: { jobs: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      poCustomer: true,
    },
  });
}

export async function getCustomerStats() {
  const [total, active, recmanSynced, poSynced] = await Promise.all([
    db.customer.count(),
    db.customer.count({ where: { isActive: true } }),
    db.customer.count({ where: { isActive: true, recmanCompanyId: { not: null } } }),
    db.customer.count({ where: { isActive: true, poCustomerId: { not: null } } }),
  ]);
  return { total, active, recmanSynced, poSynced };
}
