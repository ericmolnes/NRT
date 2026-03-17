import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scryptSync, timingSafeEqual } from "crypto";

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const testBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, testBuffer);
}

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json(
      { success: false, message: "Mangler token eller passord" },
      { status: 400 }
    );
  }

  const link = await db.evaluationLink.findUnique({
    where: { token },
    select: { password: true, authMode: true },
  });

  if (!link || link.authMode !== "PASSWORD" || !link.password) {
    return NextResponse.json(
      { success: false, message: "Ugyldig skjema" },
      { status: 400 }
    );
  }

  const valid = verifyPassword(password, link.password);

  if (!valid) {
    return NextResponse.json(
      { success: false, message: "Feil passord" },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true });
}
