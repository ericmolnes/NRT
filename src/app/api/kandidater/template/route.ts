import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { generateCandidateTemplate } from "@/lib/export/candidate-template";

export async function GET() {
  const r = await requireUser();
  if (!r.ok) {
    return NextResponse.json({ error: r.reason }, { status: r.status });
  }

  const buffer = await generateCandidateTemplate();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="kandidat-mal.xlsx"',
    },
  });
}
