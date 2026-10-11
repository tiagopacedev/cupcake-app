import type { FastifyInstance } from "fastify";

/**
 * GET /api/health (07-api-spec.md §3.1). E1 has no database yet, so this
 * always reports `database: "ok"`; E2-05 adds the real `SELECT 1` check once
 * the Prisma plugin exists.
 */
export default async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return { status: "ok", database: "ok" } as const;
  });
}
