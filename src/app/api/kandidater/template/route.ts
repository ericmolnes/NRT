import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCandidateTemplate } from "@/lib/export/candidate-template";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
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
