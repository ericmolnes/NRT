import { db } from "@/lib/db";

export async function getNCList(supplierId?: string, status?: string) {
  return db.nonConformance.findMany({
    where: {
      ...(supplierId && { supplierId }),
      ...(status && { status: status as "OPEN" | "INVESTIGATING" | "ACTION_REQUIRED" | "CLOSED" | "CANCELLED" }),
    },
    include: {
      supplier: { select: { id: true, name: true } },
      _count: { select: { actions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getNCById(id: string) {
  return db.nonConformance.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true } },
      actions: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getNCStats() {
  const [total, open, investigating, actionRequired, closed] = await Promise.all([
    db.nonConformance.count(),
    db.nonConformance.count({ where: { status: "OPEN" } }),
    db.nonConformance.count({ where: { status: "INVESTIGATING" } }),
    db.nonConformance.count({ where: { status: "ACTION_REQUIRED" } }),
    db.nonConformance.count({ where: { status: "CLOSED" } }),
  ]);
  return { total, open, investigating, actionRequired, closed };
}
