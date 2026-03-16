import { db } from "@/lib/db";

export async function getFieldCategories() {
  return db.fieldCategory.findMany({
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });
}

export async function getFieldValues(personnelId: string) {
  return db.fieldValue.findMany({
    where: { personnelId },
    include: {
      field: { include: { category: true } },
    },
  });
}
