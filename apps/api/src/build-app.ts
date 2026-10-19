import Fastify, { type FastifyInstance } from "fastify";
import type { PrismaClient } from "database";
import type { Config } from "./config.js";
import { createLoggerOptions } from "./logger.js";
import requestIdPlugin, { genRequestId } from "./plugins/request-id.js";
import securityPlugin from "./plugins/security.js";
import prismaPlugin from "./plugins/prisma.js";
import healthRoutes from "./routes/health.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import { OrderRepository } from "./repositories/order.repository.js";
import { ProductRepository } from "./repositories/product.repository.js";
import { OrderExpiryService } from "./services/order-expiry.service.js";
import { globalErrorHandler, notFoundHandler } from "./errors/error-handler.js";

export interface BuildAppOverrides {
  /** Test-only: a fake Prisma Client instead of the shared singleton (apps/api/test/helpers/fake-prisma.ts). */
  prisma?: PrismaClient;
  /** Test-only: the clock for order times and expiry (BR-12, BR-20); defaults to the real time. */
  now?: () => Date;
}

/**
 * Builds the Fastify app without starting a listener, so tests can use
 * `app.inject()` (05-testing-strategy.md §2, NFR-10). All plugins and routes
 * are registered here; `index.ts` only calls `listen()`.
 */
export async function buildApp(
  config: Config,
  overrides: BuildAppOverrides = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    genReqId: (req) => genRequestId(req.headers),
    logger: createLoggerOptions(config),
    // Client IP from x-forwarded-for, used by @fastify/rate-limit per IP
    // (02-architecture.md §8). Vercel/Neon sit behind a trusted proxy.
    trustProxy: true,
  });

  await app.register(requestIdPlugin);
  await app.register(securityPlugin, { config });
  await app.register(prismaPlugin, { config, prisma: overrides.prisma });

  app.setErrorHandler(globalErrorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Lazy expiry of unclaimed orders (BR-20), shared by every route that reads or changes stock or orders.
  const expiry = new OrderExpiryService(
    app.prisma,
    (tx) => ({ orders: new OrderRepository(tx), products: new ProductRepository(tx) }),
    overrides.now,
  );

  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(catalogRoutes, { prefix: "/api", expiry });
  await app.register(ordersRoutes, { prefix: "/api", config, expiry, now: overrides.now });

  return app;
}
