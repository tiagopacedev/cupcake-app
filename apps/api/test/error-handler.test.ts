import { afterEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../src/errors/app-error.js";
import { globalErrorHandler, notFoundHandler } from "../src/errors/error-handler.js";

async function appWithRoute(register: (app: FastifyInstance) => void): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.setErrorHandler(globalErrorHandler);
  app.setNotFoundHandler(notFoundHandler);
  register(app);
  await app.ready();
  return app;
}

describe("E1-05 global error handler", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("maps AppError to its own code, status and details", async () => {
    app = await appWithRoute((a) =>
      a.get("/boom", async () => {
        throw new AppError("INSUFFICIENT_STOCK", "Not enough stock.", {
          items: [{ productId: "p1", requested: 2, available: 1 }],
        });
      }),
    );
    const res = await app.inject({ method: "GET", url: "/boom" });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error.code).toBe("INSUFFICIENT_STOCK");
    expect(body.error.requestId).toBeTruthy();
    expect(body.error.details.items[0].productId).toBe("p1");
  });

  it("maps a Fastify schema-validation failure to VALIDATION_ERROR (400)", async () => {
    app = await appWithRoute((a) =>
      a.post(
        "/validate",
        {
          schema: {
            body: { type: "object", required: ["name"], properties: { name: { type: "string" } } },
          },
        },
        async () => ({ ok: true }),
      ),
    );
    const res = await app.inject({ method: "POST", url: "/validate", payload: {} });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("maps a raw ZodError to VALIDATION_ERROR (400) with field details", async () => {
    const schema = z.object({ name: z.string().min(2) });
    app = await appWithRoute((a) =>
      a.get("/zod", async () => {
        schema.parse({ name: "a" });
      }),
    );
    const res = await app.inject({ method: "GET", url: "/zod" });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.fields.length).toBeGreaterThan(0);
  });

  it("returns NOT_FOUND (404) for an unknown route", async () => {
    app = await appWithRoute(() => undefined);
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("returns INTERNAL_ERROR (500) with no stack trace for an unexpected throw", async () => {
    app = await appWithRoute((a) =>
      a.get("/crash", async () => {
        throw new Error("unexpected failure with a stack");
      }),
    );
    const res = await app.inject({ method: "GET", url: "/crash" });
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("at ");
    expect(body.error.message).not.toContain("unexpected failure with a stack");
  });
});
