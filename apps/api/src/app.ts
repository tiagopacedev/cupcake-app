import Fastify, { type FastifyInstance } from "fastify";
import type { Config } from "./config.js";
import { createLoggerOptions } from "./logger.js";
import requestIdPlugin, { genRequestId } from "./plugins/request-id.js";
import securityPlugin from "./plugins/security.js";
import healthRoutes from "./routes/health.routes.js";
import { globalErrorHandler, notFoundHandler } from "./errors/error-handler.js";

/**
 * Builds the Fastify app without starting a listener, so tests can use
 * `app.inject()` (05-testing-strategy.md §2, NFR-10). All plugins and routes
 * are registered here; `index.ts` only calls `listen()`.
 */
export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    genReqId: (req) => genRequestId(req.headers),
    logger: createLoggerOptions(config),
    // Client IP from x-forwarded-for, used by @fastify/rate-limit per IP
    // (02-architecture.md §8). Vercel/Neon sit behind a trusted proxy.
    trustProxy: true,
  });

  await app.register(requestIdPlugin);
  await app.register(securityPlugin, { config });

  app.setErrorHandler(globalErrorHandler);
  app.setNotFoundHandler(notFoundHandler);

  await app.register(healthRoutes, { prefix: "/api" });

  return app;
}
