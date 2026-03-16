import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getOrCreateResourcePlan,
  getResourcePlanGrid,
  getResourcePlanLabels,
  getDistinctCrews,
  getDistinctCompanies,
  getDistinctLocations,
} from "@/lib/queries/resource-plan";
import { ResourcePlanGrid } from "@/components/ressursplan/resource-plan-grid";
import { formatDate } from "@/lib/resource-plan-utils";

export default async function RessursplanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const year = new Date().getFullYear();
  const plan = await getOrCreateResourcePlan(
    year,
    session.user.id,
    session.user.name ?? "Ukjent"
  );

  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  const endDate = new Date(monday);
  endDate.setDate(endDate.getDate() + 8 * 7 - 1);

  const [entries, labels, crews, companies, locations] = await Promise.all([
    getResourcePlanGrid(plan.id, monday, endDate),
    getResourcePlanLabels(plan.id),
    getDistinctCrews(plan.id),
    getDistinctCompanies(plan.id),
    getDistinctLocations(plan.id),
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h1 className="text-lg font-semibold">Ressursplan {year}</h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} personer i planen
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResourcePlanGrid
          planId={plan.id}
          initialEntries={entries}
          initialLabels={labels}
          year={year}
          crews={crews}
          companies={companies}
          locations={locations}
        />
      </div>
    </div>
  );
}
