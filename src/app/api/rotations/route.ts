import { requireUser } from "@/lib/rbac";
import { getRotationPatterns } from "@/lib/queries/rotations";
import { NextResponse } from "next/server";

export async function GET() {
  const r = await requireUser();
  if (!r.ok) {
    return NextResponse.json({ error: r.reason }, { status: r.status });
  }

  const patterns = await getRotationPatterns();
  return NextResponse.json(patterns.map((p) => ({ id: p.id, name: p.name })));
}
