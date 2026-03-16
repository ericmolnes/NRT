import { db } from "@/lib/db";

export async function getCustomerList(search?: string) {
  return db.customer.findMany({
    where: {
      isActive: true,
      ...(search && { name: { contains: search, mode: "insensitive" as const } }),
    },
    include: {
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
  const [total, active] = await Promise.all([
    db.customer.count(),
    db.customer.count({ where: { isActive: true } }),
  ]);
  return { total, active };
}
