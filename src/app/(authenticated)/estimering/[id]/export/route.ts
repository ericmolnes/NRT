import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEstimateById } from "@/lib/queries/estimates";
import { generateEstimateExcel } from "@/lib/export/estimate-excel";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await params;
  const estimate = await getEstimateById(id);

  if (!estimate) {
    return NextResponse.json(
      { error: "Estimat ikke funnet" },
      { status: 404 }
    );
  }

  const buffer = await generateEstimateExcel(estimate);

  const filename = `Estimat_${estimate.projectNumber || estimate.id}_${
    new Date().toISOString().split("T")[0]
  }.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
