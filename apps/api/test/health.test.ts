import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { testConfig } from "./helpers/test-config.js";

describe("E1-04 GET /api/health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(testConfig());
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
