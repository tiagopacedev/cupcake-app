import type { Prisma } from "database";

export class CategoryRepository {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  /** Categories in chip order (BR-02). */
  findAllOrdered() {
    return this.prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  }
}
