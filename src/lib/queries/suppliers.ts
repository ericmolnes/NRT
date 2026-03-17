import { db } from "@/lib/db";
import type { SupplierStatus, SupplierType } from "@/generated/prisma/client";

export async function getSupplierList(search?: string, type?: string, status?: string) {
  return db.supplier.findMany({
    where: {
      ...(search && { name: { contains: search, mode: "insensitive" as const } }),
      ...(type && { type: type as SupplierType }),
      ...(status && { status: status as SupplierStatus }),
    },
    select: {
      id: true,
      name: true,
      organizationNumber: true,
      type: true,
      status: true,
      email: true,
      contactPerson: true,
      expiresAt: true,
      createdAt: true,
      _count: {
        select: {
          evaluations: true,
          nonConformances: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getSupplierById(id: string) {
  return db.supplier.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      evaluations: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { project: { select: { id: true, name: true } } },
      },
      reviews: { orderBy: { reviewDate: "desc" }, take: 10 },
      nonConformances: {
        orderBy: { createdAt: "desc" },
        include: {
          actions: { orderBy: { createdAt: "desc" } },
        },
      },
      documents: {
        include: {
          document: { select: { id: true, docNumber: true, title: true } },
        },
      },
      auditLog: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
}

export async function getSupplierStats() {
  const [total, approved, conditional, pending, expired, openNC] = await Promise.all([
    db.supplier.count(),
    db.supplier.count({ where: { status: "APPROVED" } }),
    db.supplier.count({ where: { status: "CONDITIONAL" } }),
    db.supplier.count({ where: { status: "PENDING" } }),
    db.supplier.count({ where: { status: "EXPIRED" } }),
    db.nonConformance.count({ where: { status: { in: ["OPEN", "INVESTIGATING", "ACTION_REQUIRED"] } } }),
  ]);
  return { total, approved, conditional, pending, expired, openNC };
}

export async function getSupplierSelectList() {
  return db.supplier.findMany({
    where: { status: { in: ["APPROVED", "CONDITIONAL"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
