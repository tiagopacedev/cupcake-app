import type { Config } from "../../src/config.js";

/**
 * Base config for tests; override per test (e.g. a low RATE_LIMIT_MAX).
 * DATABASE_URL just needs to satisfy `envSchema` (a non-empty string) — a
 * test that calls `buildApp` normally also passes a fake `prisma` override
 * (see `helpers/fake-prisma.ts`), so this value is never actually connected
 * to. Only `*.int.test.ts` files need — and set — a real, reachable one.
 */
export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    NODE_ENV: "test",
    PORT: 0,
    LOG_LEVEL: "silent",
    WEB_ORIGIN: "https://cupcake-web.example",
    DATABASE_URL: "postgresql://cupcake:cupcake@localhost:5432/cupcake_test?sslmode=disable",
    RATE_LIMIT_MAX: 120,
    RATE_LIMIT_WINDOW_MS: 60_000,
    ORDERS_RATE_LIMIT_MAX: 10,
    ...overrides,
  };
}
