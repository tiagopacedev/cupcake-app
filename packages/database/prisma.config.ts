import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// The one `.env` lives at the repo root (06-development-workflow.md §1). Resolved from this
// file, not from the working directory, because the CLI runs from packages/database.
// Variables already set in the shell win; a missing file is fine (CI and Vercel set real ones).
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

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
