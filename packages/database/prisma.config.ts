import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 CLI config (02-architecture.md §4). `datasource.url` is used by
 * the CLI (migrate, studio, db pull) and must be the Neon **direct**
 * connection — migrations run DDL and take advisory locks that don't work
 * through the pooled/pgbouncer endpoint (02-architecture.md §9 DIRECT_URL).
 * Prisma Client at runtime gets DATABASE_URL (pooled) through
 * @prisma/adapter-pg instead (src/client.ts) — this file doesn't affect that.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
