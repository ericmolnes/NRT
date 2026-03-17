import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStaffingPlan } from "@/lib/queries/resource-plan";
import { StaffingPlanGrid } from "@/components/ressursplan/staffing-plan-grid";
import { formatDate } from "@/lib/resource-plan-utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, UserCheck, UserX, Briefcase } from "lucide-react";

export default async function RessursplanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Start from this Monday, show 8 weeks
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  const endDate = new Date(monday);
  endDate.setDate(endDate.getDate() + 8 * 7 - 1);

  const data = await getStaffingPlan(monday, endDate);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="px-4 py-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Bemanningsplan
            </h1>
            <p className="text-sm text-muted-foreground">
              Oversikt over bemanning per kunde og jobb
            </p>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="py-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Kunder</CardTitle>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className="text-xl font-bold">{data.stats.totalCustomers}</div>
              <p className="text-[10px] text-muted-foreground">Med aktive jobber</p>
            </CardContent>
          </Card>
          <Card className="py-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Jobber</CardTitle>
              <Briefcase className="h-3.5 w-3.5 text-blue-500" />
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className="text-xl font-bold text-blue-600">{data.stats.totalJobs}</div>
              <p className="text-[10px] text-muted-foreground">Aktive jobber</p>
            </CardContent>
          </Card>
          <Card className="py-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Tilordnet</CardTitle>
              <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className="text-xl font-bold text-emerald-600">{data.stats.totalAssigned}</div>
              <p className="text-[10px] text-muted-foreground">Personell p\u00e5 jobb</p>
            </CardContent>
          </Card>
          <Card className="py-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Ledig</CardTitle>
              <UserX className="h-3.5 w-3.5 text-amber-500" />
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className="text-xl font-bold text-amber-600">{data.stats.totalAvailable}</div>
              <p className="text-[10px] text-muted-foreground">Tilgjengelig personell</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 p-2">
        <StaffingPlanGrid
          initialData={data}
          initialStartDate={formatDate(monday)}
        />
      </div>
    </div>
  );
}
