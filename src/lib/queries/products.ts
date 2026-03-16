import { db } from "@/lib/db";

export interface ProductSearchResult {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  unitCode: string;
  unitName: string;
  priceOre: number;
  priceNOK: number;
  manufacturer: string | null;
  classification: string | null;
  stocked: boolean;
  imageUrl: string | null;
}

export async function searchProducts(
  query: string,
  limit = 20
): Promise<ProductSearchResult[]> {
  const activePriceList = await db.priceList.findFirst({
    where: { active: true },
    select: { id: true },
  });

  if (!activePriceList) return [];

  const products = await db.product.findMany({
    where: {
      priceListId: activePriceList.id,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { productId: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    productId: p.productId,
    name: p.name,
    description: p.description,
    unitCode: p.unitCode,
    unitName: p.unitName,
    priceOre: p.priceOre,
    priceNOK: p.priceOre / 100,
    manufacturer: p.manufacturer,
    classification: p.classification,
    stocked: p.stocked,
    imageUrl: p.imageUrl,
  }));
}

export async function getActivePriceList() {
  return db.priceList.findFirst({
    where: { active: true },
    include: { _count: { select: { products: true } } },
  });
}

export async function getProductById(id: string) {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) return null;
  return {
    ...product,
    priceNOK: product.priceOre / 100,
  };
}
