import { requireUser } from "@/lib/rbac";
import { getStaffingPlan } from "@/lib/queries/resource-plan";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const r = await requireUser();
  if (!r.ok) {
    return NextResponse.json({ error: r.reason }, { status: r.status });
  }

  const params = request.nextUrl.searchParams;
  const startDateStr = params.get("startDate");
  const endDateStr = params.get("endDate");

  if (!startDateStr || !endDateStr) {
    return NextResponse.json(
      { error: "startDate og endDate er p\u00e5krevd" },
      { status: 400 }
    );
  }

  const search = params.get("search") ?? undefined;
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const data = await getStaffingPlan(startDate, endDate, search);

  return NextResponse.json(data);
}
