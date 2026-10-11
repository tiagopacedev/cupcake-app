import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createPrismaClient, type PrismaClient } from "database";
import type { Config } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

interface PrismaPluginOptions {
  config: Config;
  /** Test-only override (apps/api/test/helpers/fake-prisma.ts) instead of a real client built from `config.DATABASE_URL`. */
  prisma?: PrismaClient;
}

/**
 * Decorates the app with a Prisma Client (02-architecture.md §4, E2-05) and
 * disconnects it when the app closes. Built from this process's own
 * validated `config.DATABASE_URL` (not a separate `process.env` read), so
 * changing the config actually changes which database the app talks to —
 * exercised by `health.int.test.ts`'s "database is down" case. Tests that
 * don't care about real DB behavior pass a fake instead (`buildApp`'s
 * second argument), so unit tests for CORS/helmet/rate-limit/request-id
 * don't need a reachable Postgres.
 */
export default fp(async function prismaPlugin(app: FastifyInstance, opts: PrismaPluginOptions) {
  const client = opts.prisma ?? createPrismaClient(opts.config.DATABASE_URL);
  app.decorate("prisma", client);
  app.addHook("onClose", async () => {
    await client.$disconnect();
  });
});
