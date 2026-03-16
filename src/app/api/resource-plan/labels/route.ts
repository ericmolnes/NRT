import { auth } from "@/lib/auth";
import { getResourcePlanLabels } from "@/lib/queries/resource-plan";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const planId = request.nextUrl.searchParams.get("planId");
  if (!planId) {
    return NextResponse.json({ error: "planId er påkrevd" }, { status: 400 });
  }

  const labels = await getResourcePlanLabels(planId);
  return NextResponse.json(labels);
}
