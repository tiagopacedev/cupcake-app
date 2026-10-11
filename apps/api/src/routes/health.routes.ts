import type { FastifyInstance } from "fastify";

/**
 * GET /api/health (07-api-spec.md §3.1). Runs a real `SELECT 1` through the
 * Prisma plugin (E2-05, plugins/prisma.ts). A failure isn't caught here: it
 * propagates to the global error handler, which maps any unexpected error
 * to `500 INTERNAL_ERROR` (errors/error-handler.ts) — exactly the contract
 * "500 INTERNAL_ERROR if the database is unreachable".
 */
export default async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    await app.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", database: "ok" } as const;
  });
}
