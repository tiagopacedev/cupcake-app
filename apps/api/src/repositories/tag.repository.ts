import type { PrismaClient } from "database";

export class TagRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll() {
    return this.prisma.tag.findMany({ orderBy: { name: "asc" } });
  }
}
