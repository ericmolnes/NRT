import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { syncTriggerSchema } from "@/lib/validations/poweroffice";
import { runSync } from "@/lib/poweroffice/sync-all";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }

  // Rate limit: max 1 sync per 60 seconds
  const { allowed, retryAfterMs } = checkRateLimit("poweroffice-sync", 60_000);
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Synkronisering pågår. Prøv igjen om ${Math.ceil(retryAfterMs / 1000)} sekunder.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = syncTriggerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ugyldig forespørsel", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const results = await runSync(parsed.data.resource, session.user.id);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[PowerOffice Sync] Feil:", error);
    return NextResponse.json(
      { error: "Synkronisering feilet. Prøv igjen." },
      { status: 500 }
    );
  }
}
