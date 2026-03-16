import { db } from "@/lib/db";

// ─── Dashboard-statistikk ──────────────────────────────────────────

export async function getPODashboardStats() {
  const [customers, projects, employees, invoices] = await Promise.all([
    db.pOCustomer.count(),
    db.pOProject.count(),
    db.pOEmployee.count(),
    db.pOInvoice.count(),
  ]);
  return { customers, projects, employees, invoices };
}

// ─── Synk-status ───────────────────────────────────────────────────

export async function getLatestSyncPerResource() {
  const resourceTypes = ["Customer", "Project", "Employee", "Invoice"];
  const results = await Promise.all(
    resourceTypes.map((type) =>
      db.pOSyncLog.findFirst({
        where: { resourceType: type },
        orderBy: { startedAt: "desc" },
      })
    )
  );
  return Object.fromEntries(
    resourceTypes.map((type, i) => [type, results[i]])
  );
}

export async function getSyncHistory(resourceType?: string, limit = 20) {
  return db.pOSyncLog.findMany({
    where: resourceType ? { resourceType } : undefined,
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

// ─── Kunder ────────────────────────────────────────────────────────

export async function getPOCustomerList(search?: string) {
  return db.pOCustomer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { organizationNumber: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { projects: true, invoices: true } },
    },
  });
}

export async function getPOCustomerById(id: string) {
  return db.pOCustomer.findUnique({
    where: { id },
    include: {
      projects: { orderBy: { name: "asc" } },
      invoices: { orderBy: { invoiceDate: "desc" }, take: 20 },
    },
  });
}

// ─── Prosjekter ────────────────────────────────────────────────────

export async function getPOProjectList(search?: string) {
  return db.pOProject.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: {
      customer: { select: { id: true, name: true } },
      _count: { select: { invoices: true } },
    },
  });
}

export async function getPOProjectById(id: string) {
  return db.pOProject.findUnique({
    where: { id },
    include: {
      customer: true,
      invoices: { orderBy: { invoiceDate: "desc" }, take: 20 },
    },
  });
}

// ─── Ansatte ───────────────────────────────────────────────────────

export async function getPOEmployeeList(search?: string) {
  return db.pOEmployee.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { lastName: "asc" },
    include: {
      personnel: { select: { id: true, name: true } },
    },
  });
}

export async function getPOEmployeeById(id: string) {
  return db.pOEmployee.findUnique({
    where: { id },
    include: {
      personnel: true,
    },
  });
}

// ─── Fakturaer ─────────────────────────────────────────────────────

export async function getPOInvoiceList(search?: string) {
  return db.pOInvoice.findMany({
    where: search
      ? {
          OR: [
            { invoiceNumber: { contains: search } },
            { customer: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: { invoiceDate: "desc" },
    include: {
      customer: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });
}

export async function getPOInvoiceById(id: string) {
  return db.pOInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      project: true,
    },
  });
}
