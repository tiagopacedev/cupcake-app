import type { PrismaClient } from "database";

/**
 * Minimal stand-in for the Prisma Client, used by unit tests that build a
 * real app (`buildApp`) only to exercise something else — CORS, helmet,
 * rate limiting, the request-id echo — and shouldn't need a reachable
 * database for that (05-testing-strategy.md §2 "Unit" row: fakes, not a
 * real Postgres). Only `$queryRaw` is implemented because the health route
 * is the only thing that calls it today; extend as new routes need more.
 *
 * Real database behavior — a live 200 and a genuine 500 when the database
 * is down — is covered by `apps/api/test/health.int.test.ts` against a real
 * PostgreSQL, never by this fake (05-testing-strategy.md: don't mock the
 * database in integration tests — this one is a unit-level fake instead).
 */
export function fakePrismaOk(): PrismaClient {
  return {
    $queryRaw: async () => [{ "?column?": 1 }],
    $disconnect: async () => undefined,
  } as unknown as PrismaClient;
}

export function fakePrismaDown(): PrismaClient {
  return {
    $queryRaw: async () => {
      throw new Error("Connection terminated unexpectedly");
    },
    $disconnect: async () => undefined,
  } as unknown as PrismaClient;
}
