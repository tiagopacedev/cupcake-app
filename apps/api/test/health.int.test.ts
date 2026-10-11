import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { testConfig } from "./helpers/test-config.js";

/**
 * E2-05 AC (docs/08-execution-plan.md §5): "Health returns database: ok;
 * 500 INTERNAL_ERROR when DB down (test)". Real PostgreSQL required — set
 * DATABASE_URL to the local `cupcake_test` database (docker compose up -d
 * db, 06-development-workflow.md §1) or the CI Postgres service before
 * running `pnpm test:int`. Unlike health.test.ts, this one uses the real
 * Prisma plugin (no fake override), per 05-testing-strategy.md's "don't
 * mock the database in integration tests".
 */
describe("E2-05 GET /api/health against a real database", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("returns 200 { status: 'ok', database: 'ok' } against the real test database", async () => {
    app = await buildApp(testConfig({ DATABASE_URL: process.env.DATABASE_URL }));
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", database: "ok" });
  });

  it("returns 500 INTERNAL_ERROR when the database is unreachable", async () => {
    // A closed local port fails fast (connection refused) instead of
    // hanging on a DNS/timeout the way an unreachable hostname would.
    app = await buildApp(
      testConfig({ DATABASE_URL: "postgresql://cupcake:cupcake@localhost:1/cupcake_test" }),
    );
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(500);
    expect(res.json().error.code).toBe("INTERNAL_ERROR");
  });
});
