import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (05-testing-strategy.md §3.6, T-X-8): the production build
 * of the web app (`next build && next start`) and the compiled API, on their
 * own ports, against a disposable `cupcake_test` database that every test
 * resets and re-seeds. Runs one worker (one shared database) in two
 * projects: mobile (390×844) and desktop (1280×800).
 */
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://cupcake:cupcake@localhost:5432/cupcake_test?sslmode=disable";
const API_PORT = 4100;
const WEB_PORT = 3100;
const WEB_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }], ["github"]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: WEB_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter api build:dist && node apps/api/dist/index.js",
      cwd: "..",
      url: `http://localhost:${API_PORT}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: "test",
        PORT: String(API_PORT),
        LOG_LEVEL: "warn",
        DATABASE_URL,
        WEB_ORIGIN: WEB_URL,
        // Many orders come from one IP; the rate limit has its own integration test.
        RATE_LIMIT_MAX: "100000",
        ORDERS_RATE_LIMIT_MAX: "100000",
      },
    },
    {
      // `API_URL` is baked into the `/api/*` rewrite at build time.
      command: `pnpm --filter web exec next build && pnpm --filter web exec next start --port ${WEB_PORT}`,
      cwd: "..",
      url: WEB_URL,
      timeout: 240_000,
      reuseExistingServer: false,
      env: {
        API_URL: `http://localhost:${API_PORT}`,
        NEXT_PUBLIC_SITE_URL: WEB_URL,
      },
    },
  ],
});
