import type { Prisma } from "database";

export class TagRepository {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  findAll() {
    return this.prisma.tag.findMany({ orderBy: { name: "asc" } });
  }
}
