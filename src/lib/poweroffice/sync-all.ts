import { syncCustomers } from "./sync-customers";
import { syncProjects } from "./sync-projects";
import { syncEmployees } from "./sync-employees";
import { syncInvoices } from "./sync-invoices";

export type SyncResourceType =
  | "all"
  | "customers"
  | "projects"
  | "employees"
  | "invoices";

const syncFunctions = {
  customers: syncCustomers,
  projects: syncProjects,
  employees: syncEmployees,
  invoices: syncInvoices,
} as const;

export async function runSync(resource: SyncResourceType, userId: string) {
  if (resource === "all") {
    // Kjør i rekkefølge: kunder først (andre avhenger av dem)
    const results = {
      customers: await syncCustomers(userId),
      projects: await syncProjects(userId),
      employees: await syncEmployees(userId),
      invoices: await syncInvoices(userId),
    };
    return results;
  }

  const syncFn = syncFunctions[resource];
  return { [resource]: await syncFn(userId) };
}
