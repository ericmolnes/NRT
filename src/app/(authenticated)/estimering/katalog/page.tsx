import { db } from "@/lib/db";
import { ProductCatalog } from "@/components/estimering/product-catalog";

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function ProductCatalogPage({ searchParams }: PageProps) {
  const { q, page } = await searchParams;
  const currentPage = parseInt(page || "1", 10);
  const pageSize = 50;
  const skip = (currentPage - 1) * pageSize;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { productId: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [products, totalCount] = await Promise.all([
    db.product.findMany({
      where,
      take: pageSize,
      skip,
      orderBy: { name: "asc" },
    }),
    db.product.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Produktkatalog</h1>
        <p className="text-muted-foreground">
          {totalCount.toLocaleString("nb-NO")} produkter i databasen
        </p>
      </div>

      <ProductCatalog
        products={products}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        query={q || ""}
      />
    </div>
  );
}
