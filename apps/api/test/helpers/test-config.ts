import type { Config } from "../../src/config.js";

/** Base config for tests; override per test (e.g. a low RATE_LIMIT_MAX). */
export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    NODE_ENV: "test",
    PORT: 0,
    LOG_LEVEL: "silent",
    WEB_ORIGIN: "https://cupcake-web.example",
    DATABASE_URL: undefined,
    DIRECT_URL: undefined,
    RATE_LIMIT_MAX: 120,
    RATE_LIMIT_WINDOW_MS: 60_000,
    ...overrides,
  };
}
