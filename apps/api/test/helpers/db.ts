import { createPrismaClient, seedCatalog, type PrismaClient } from "database";

/**
 * Real-database setup for `*.int.test.ts` (05-testing-strategy.md §3.2):
 * one disposable `cupcake_test` database, truncated and re-seeded with the
 * six-product catalog before each test. Refuses to run unless the database
 * name contains "test": these helpers TRUNCATE every table, and a developer's
 * `.env` may point `DATABASE_URL` at the real Neon database.
 */
export function requireTestDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required for integration tests (point it at cupcake_test, " +
        "06-development-workflow.md §1).",
    );
  }
  const databaseName = new URL(url).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing to run: DATABASE_URL points at database "${databaseName}", which does not look ` +
        'like a test database (expected the name to contain "test"). These tests TRUNCATE every table.',
    );
  }
  return url;
}

export function createTestPrisma(): PrismaClient {
  return createPrismaClient(requireTestDatabaseUrl());
}

/** Empties every table and loads the seed catalog (three categories, one tag, six products). */
export async function resetAndSeed(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE order_items, orders, customers, product_tags, products, tags, categories RESTART IDENTITY CASCADE",
  );
  await seedCatalog(prisma);
}
