import { requireUser } from "@/lib/rbac";
import { getResourcePlanLabels } from "@/lib/queries/resource-plan";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const r = await requireUser();
  if (!r.ok) {
    return NextResponse.json({ error: r.reason }, { status: r.status });
  }

  const planId = request.nextUrl.searchParams.get("planId");
  if (!planId) {
    return NextResponse.json({ error: "planId er påkrevd" }, { status: 400 });
  }

  const labels = await getResourcePlanLabels(planId);
  return NextResponse.json(labels);
}
