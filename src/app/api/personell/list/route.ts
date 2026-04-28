import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const r = await requireUser();
  if (!r.ok) {
    return NextResponse.json({ error: r.reason }, { status: r.status });
  }

  const search = request.nextUrl.searchParams.get("search") ?? undefined;

  const personnel = await db.personnel.findMany({
    where: {
      status: "ACTIVE",
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { role: { contains: search, mode: "insensitive" as const } },
          { department: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    },
    select: { id: true, name: true, role: true, department: true },
    orderBy: { name: "asc" },
    take: 50,
  });

  return NextResponse.json(personnel);
}
