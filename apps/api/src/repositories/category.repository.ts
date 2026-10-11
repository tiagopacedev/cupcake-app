import type { PrismaClient } from "database";

export class CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Categories in chip order (BR-02). */
  findAllOrdered() {
    return this.prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  }
}
