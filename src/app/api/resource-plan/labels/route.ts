import { auth } from "@/lib/auth";
import { isUser } from "@/lib/rbac";
import { getResourcePlanLabels } from "@/lib/queries/resource-plan";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  if (!(await isUser())) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }

  const planId = request.nextUrl.searchParams.get("planId");
  if (!planId) {
    return NextResponse.json({ error: "planId er påkrevd" }, { status: 400 });
  }

  const labels = await getResourcePlanLabels(planId);
  return NextResponse.json(labels);
}
