import { createPrismaClient, seedCatalog, type PrismaClient } from "database";

/**
 * Direct database access for the E2E tests: reset to the seed catalog before
 * each test, change stock to force a conflict (E2E-2), count orders (E2E-3).
 * Refuses any database whose name does not contain "test": it TRUNCATEs
 * every table.
 */
const url =
  process.env.E2E_DATABASE_URL ??
  "postgresql://cupcake:cupcake@localhost:5432/cupcake_test?sslmode=disable";

const databaseName = new URL(url).pathname.replace(/^\//, "");
if (!databaseName.toLowerCase().includes("test")) {
  throw new Error(
    `Refusing to run: E2E database "${databaseName}" does not look like a test database ` +
      '(the name must contain "test"). These tests TRUNCATE every table.',
  );
}

let prisma: PrismaClient | undefined;
const client = (): PrismaClient => (prisma ??= createPrismaClient(url));

export const db = {
  /** Empties every table and loads the six-product seed catalog. */
  async reset(): Promise<void> {
    await client().$executeRawUnsafe(
      "TRUNCATE TABLE order_items, orders, customers, product_tags, products, tags, categories RESTART IDENTITY CASCADE",
    );
    await seedCatalog(client());
  },
  async setStock(slug: string, stockQuantity: number): Promise<void> {
    await client().product.update({ where: { slug }, data: { stockQuantity } });
  },
  async stockOf(slug: string): Promise<number> {
    return (await client().product.findUniqueOrThrow({ where: { slug } })).stockQuantity;
  },
  async countOrders(): Promise<number> {
    return client().order.count();
  },
  async close(): Promise<void> {
    await prisma?.$disconnect();
    prisma = undefined;
  },
};
