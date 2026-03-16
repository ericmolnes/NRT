import { auth } from "@/lib/auth";
import { getResourcePlanGrid, getResourcePlanStats } from "@/lib/queries/resource-plan";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const planId = params.get("planId");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");

  if (!planId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "planId, startDate og endDate er påkrevd" },
      { status: 400 }
    );
  }

  const filters = {
    search: params.get("search") ?? undefined,
    crew: params.get("crew") ?? undefined,
    company: params.get("company") ?? undefined,
    location: params.get("location") ?? undefined,
  };

  const [entries, stats] = await Promise.all([
    getResourcePlanGrid(
      planId,
      new Date(startDate),
      new Date(endDate),
      filters
    ),
    getResourcePlanStats(planId),
  ]);

  return NextResponse.json({ entries, stats });
}
