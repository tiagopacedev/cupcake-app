import type { PrismaClient } from "database";

export interface ProductFilter {
  categorySlug?: string;
  tagSlug?: string;
}

/** Prisma access for products (02-architecture.md §3): queries only, no business decisions. */
export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Active products with their category and tags (BR-04), in display order:
   * category `sortOrder`, then insertion (seed) order, then name as a
   * tie-break (07-api-spec.md §3.3).
   */
  findActive(filter: ProductFilter = {}) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(filter.categorySlug ? { category: { slug: filter.categorySlug } } : {}),
        ...(filter.tagSlug ? { tags: { some: { tag: { slug: filter.tagSlug } } } } : {}),
      },
      include: {
        category: true,
        tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { createdAt: "asc" }, { name: "asc" }],
    });
  }
}

export type ProductRecord = Awaited<ReturnType<ProductRepository["findActive"]>>[number];
