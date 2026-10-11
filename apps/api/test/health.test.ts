import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/build-app.js";
import { testConfig } from "./helpers/test-config.js";
import { fakePrismaOk } from "./helpers/fake-prisma.js";

/**
 * Unit-level: exercises the route and the request-id plumbing with a fake
 * Prisma Client, so it doesn't need a reachable database
 * (05-testing-strategy.md §2 "Unit"). The real `SELECT 1` behavior — a
 * genuine 200 and a genuine 500 when the database is down — is
 * `health.int.test.ts` (E2-05 AC), against a real PostgreSQL.
 */
describe("E1-04/E2-05 GET /api/health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(testConfig(), { prisma: fakePrismaOk() });
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with status and database ok", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", database: "ok" });
  });

  it("carries an x-request-id response header", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("echoes an inbound x-request-id instead of replacing it", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { "x-request-id": "test-fixed-id-123" },
    });
    expect(res.headers["x-request-id"]).toBe("test-fixed-id-123");
  });
});
