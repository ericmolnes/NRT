import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isUser } from "@/lib/rbac";
import { getLatestSyncPerResource } from "@/lib/queries/poweroffice";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  if (!(await isUser())) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
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
