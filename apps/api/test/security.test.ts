import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/build-app.js";
import { testConfig } from "./helpers/test-config.js";
import { fakePrismaOk } from "./helpers/fake-prisma.js";

// These tests exercise CORS/helmet/rate-limit via /api/health as a
// convenient cheap route — a fake Prisma Client (health.test.ts's helper)
// keeps that DB-independent, since none of them care about the DB check.
describe("E1-06 security plugins", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("sets Access-Control-Allow-Origin for the configured WEB_ORIGIN", async () => {
    app = await buildApp(testConfig({ WEB_ORIGIN: "https://cupcake-web.example" }), {
      prisma: fakePrismaOk(),
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { origin: "https://cupcake-web.example" },
    });
    expect(res.headers["access-control-allow-origin"]).toBe("https://cupcake-web.example");
  });

  it("does not grant CORS to a different origin", async () => {
    app = await buildApp(testConfig({ WEB_ORIGIN: "https://cupcake-web.example" }), {
      prisma: fakePrismaOk(),
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { origin: "https://evil.example" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("sets helmet security headers", async () => {
    app = await buildApp(testConfig(), { prisma: fakePrismaOk() });
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("returns 429 RATE_LIMITED once a low limit is exceeded", async () => {
    app = await buildApp(testConfig({ RATE_LIMIT_MAX: 2, RATE_LIMIT_WINDOW_MS: 60_000 }), {
      prisma: fakePrismaOk(),
    });
    await app.inject({ method: "GET", url: "/api/health" });
    await app.inject({ method: "GET", url: "/api/health" });
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe("RATE_LIMITED");
  });
});
