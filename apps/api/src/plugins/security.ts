import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import type { Config } from "../config.js";

/**
 * Security plugins (02-architecture.md §8): helmet headers, CORS limited to
 * WEB_ORIGIN, and a default rate limit (120 req/min per IP). Routes that need
 * a stricter limit (POST /api/orders → 10/min, 07-api-spec.md §1) override it
 * with their own `config.rateLimit` when that route is added in E6.
 */
export default fp(async function securityPlugin(app: FastifyInstance, opts: { config: Config }) {
  await app.register(helmet);

  await app.register(cors, {
    origin: [opts.config.WEB_ORIGIN],
    methods: ["GET", "POST"],
  });

  await app.register(rateLimit, {
    global: true,
    max: opts.config.RATE_LIMIT_MAX,
    timeWindow: opts.config.RATE_LIMIT_WINDOW_MS,
  });
});
