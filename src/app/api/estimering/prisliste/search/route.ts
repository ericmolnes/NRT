import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchProducts } from "@/lib/queries/products";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  if (query.length < 2) {
    return NextResponse.json({ products: [] });
  }

  const products = await searchProducts(query, limit);

  return NextResponse.json({ products });
}
