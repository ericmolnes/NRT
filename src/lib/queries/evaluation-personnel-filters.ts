import type { Prisma } from "@/generated/prisma/client";
import {
  buildCategoryWhere,
  type PersonnelCategory,
} from "@/lib/personell/category";
import { parseLinkFilters } from "@/lib/forms/link-filters";

function legacyRoleToCategories(
  roleFilter?: string | null
): PersonnelCategory[] | null {
  return parseLinkFilters({
    categoriesFilter: null,
    departmentsFilter: null,
    personnelIds: null,
    roleFilter: roleFilter ?? null,
  }).categories;
}

export function buildEvaluationRoleWhere(
  roleFilter?: string | null,
  now: Date = new Date()
): Prisma.PersonnelWhereInput {
  if (!roleFilter) return {};

  const categories = legacyRoleToCategories(roleFilter);
  if (!categories) return { role: roleFilter };

  if (categories.length === 1) {
    return buildCategoryWhere(
      categories[0],
      now
    ) as Prisma.PersonnelWhereInput;
  }

  return {
    OR: categories.map(
      (category) =>
        buildCategoryWhere(category, now) as Prisma.PersonnelWhereInput
    ),
  };
}
