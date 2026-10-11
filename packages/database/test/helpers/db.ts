import { Pool } from "pg";

/**
 * Shared `pg` connection for the "Database" test level
 * (05-testing-strategy.md §2/§3.3): schema-diff and constraint tests talk to
 * Postgres directly, not through Prisma Client, so they don't depend on
 * `prisma generate` having run.
 *
 * Needs `DATABASE_URL` pointed at a disposable test database — locally the
 * `cupcake_test` database created by `docker compose up -d db`
 * (06-development-workflow.md §1), or the CI Postgres service's test
 * database (05-testing-strategy.md §2). These tests `TRUNCATE` every table,
 * so `createTestPool` refuses to connect unless the database name contains
 * "test" — a guard against accidentally pointing this at `cupcake_dev`, or
 * worse, the real Neon database.
 */
export function createTestPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required to run packages/database's integration tests " +
        "(point it at the local cupcake_test database, 06-development-workflow.md §1).",
    );
  }

  let databaseName: string;
  try {
    databaseName = new URL(connectionString).pathname.replace(/^\//, "");
  } catch {
    throw new Error(`DATABASE_URL is not a valid connection URL: ${connectionString}`);
  }
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing to run: DATABASE_URL points at database "${databaseName}", which doesn't ` +
        'look like a test database (expected the name to contain "test"). These tests ' +
        "TRUNCATE every table — point DATABASE_URL at cupcake_test instead.",
    );
  }

  return new Pool({ connectionString });
}

const ALL_TABLES = [
  "order_items",
  "orders",
  "customers",
  "product_tags",
  "products",
  "tags",
  "categories",
] as const;

/** Empties every table between tests. No identity sequences to restart — ids are uuid. */
export async function truncateAll(pool: Pool): Promise<void> {
  await pool.query(`TRUNCATE TABLE ${ALL_TABLES.map((t) => `"${t}"`).join(", ")} CASCADE;`);
}
