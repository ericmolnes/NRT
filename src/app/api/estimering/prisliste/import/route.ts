import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { parseEfoFile, parseEfoDate } from "@/lib/efo-parser";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }

  // Rate limit: max 1 import per 5 minutes
  const { allowed, retryAfterMs } = checkRateLimit(
    "prisliste-import",
    5 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json(
      {
        error: `For mange forespørsler. Prøv igjen om ${Math.ceil(retryAfterMs / 1000)} sekunder.`,
      },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Ingen fil lastet opp" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for EFO files)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Filen er for stor. Maks 10MB." },
        { status: 400 }
      );
    }

    // Les filen som tekst (EFO-filer er typisk latin1/iso-8859-1)
    const buffer = await file.arrayBuffer();
    const content = new TextDecoder("latin1").decode(buffer);

    // Parser EFO-filen
    const { header, products } = parseEfoFile(content);

    // Atomic transaction: deactivate old + create new + insert products
    const result = await db.$transaction(async (tx) => {
      // Deaktiver eksisterende prislister
      await tx.priceList.updateMany({
        where: { active: true },
        data: { active: false },
      });

      // Opprett ny prisliste
      const priceList = await tx.priceList.create({
        data: {
          supplier: header.supplier,
          vatNumber: header.vatNumber,
          currency: header.currency,
          validFrom: parseEfoDate(header.validFrom),
          validTo: parseEfoDate(header.validTo),
          importedBy: session.user!.id ?? "unknown",
          productCount: products.length,
          active: true,
        },
      });

      // Batch-insert produkter (1000 om gangen)
      const BATCH_SIZE = 1000;
      let imported = 0;

      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        await tx.product.createMany({
          data: batch.map((p) => ({
            productId: p.productId,
            categoryCode: p.categoryCode,
            name: p.name,
            description: p.description || null,
            quantityPerUnit: p.quantityPerUnit,
            unitCode: p.unitCode,
            unitName: p.unitName,
            priceOre: p.priceOre,
            validFrom: parseEfoDate(p.validFrom || header.validFrom),
            discountGroup: p.discountGroup || null,
            classification: p.classification || null,
            manufacturer: p.manufacturer || null,
            supplierProductId: p.supplierProductId || null,
            stocked: p.stocked,
            imageUrl: p.imageUrl,
            priceListId: priceList.id,
          })),
          skipDuplicates: true,
        });
        imported += batch.length;
      }

      return { priceList, imported };
    });

    return NextResponse.json({
      success: true,
      priceListId: result.priceList.id,
      supplier: header.supplier,
      productCount: result.imported,
      validFrom: header.validFrom,
      validTo: header.validTo,
    });
  } catch (error) {
    console.error("Feil ved import av prisliste:", error);
    return NextResponse.json(
      { error: "Import feilet. Prøv igjen." },
      { status: 500 }
    );
  }
}
