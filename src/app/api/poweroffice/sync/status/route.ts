import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { getLatestSyncPerResource } from "@/lib/queries/poweroffice";

export async function GET() {
  const r = await requireUser();
  if (!r.ok) {
    return NextResponse.json({ error: r.reason }, { status: r.status });
  }

  try {
    const status = await getLatestSyncPerResource();
    return NextResponse.json(status);
  } catch (error) {
    console.error("[PowerOffice Sync Status] Feil:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente synk-status" },
      { status: 500 }
    );
  }
}
