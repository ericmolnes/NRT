import { auth } from "@/lib/auth";
import { getRotationPatterns } from "@/lib/queries/rotations";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const patterns = await getRotationPatterns();
  return NextResponse.json(patterns.map((p) => ({ id: p.id, name: p.name })));
}
