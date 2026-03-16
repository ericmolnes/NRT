import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/poweroffice/sync-all";
import { syncAllRecman } from "@/lib/recman/sync";

/**
 * Cron endpoint for automated sync of PowerOffice and Recman.
 * Secured with CRON_SECRET to prevent unauthorized access.
 *
 * Schedule: Every 2 hours between 06:00-00:00 (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // Sync PowerOffice
  try {
    const poResult = await runSync("all", "cron");
    results.poweroffice = { success: true, ...poResult };
  } catch (error) {
    results.poweroffice = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Sync Recman (candidates + companies + projects + jobs)
  try {
    const recmanResult = await syncAllRecman("cron");
    results.recman = { success: true, ...recmanResult };
  } catch (error) {
    results.recman = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results,
  });
}
