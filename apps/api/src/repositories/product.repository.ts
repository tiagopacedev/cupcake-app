import type { Prisma } from "database";

export interface ProductFilter {
  categorySlug?: string;
  tagSlug?: string;
}

/** Prisma access for products (02-architecture.md §3): queries only, no business decisions. */
export class ProductRepository {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

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

  /** Active products among `ids`, with the columns an order needs (BR-04: inactive ones are unavailable). */
  findActiveByIds(ids: string[]) {
    return this.prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, slug: true, name: true, imageUrl: true, priceCents: true },
    });
  }

  /**
   * Atomic conditional decrement (BR-11): `UPDATE … SET stock = stock - q WHERE
   * id = ? AND stock >= q`. Returns the affected rows: 1 on success, 0 when
   * there is not enough stock, so two concurrent orders can never both take
   * the last units.
   */
  async decrementStock(productId: string, quantity: number): Promise<number> {
    const result = await this.prisma.product.updateMany({
      where: { id: productId, stockQuantity: { gte: quantity } },
      data: { stockQuantity: { decrement: quantity } },
    });
    return result.count;
  }

  /** Current stock of a product, or `null` when it does not exist. */
  async findStock(productId: string): Promise<number | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true },
    });
    return product?.stockQuantity ?? null;
  }
}

export type ProductRecord = Awaited<ReturnType<ProductRepository["findActive"]>>[number];
