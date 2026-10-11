import { defineConfig } from "vitest/config";

/**
 * Separate config for `test:int` (05-testing-strategy.md §2/§3.3's
 * "Database" level, against a real Postgres). `vitest.config.ts`'s own
 * `test.exclude` hard-excludes `**\/*.int.test.ts` so the ordinary `test`
 * run and its coverage stay DB-independent — but a Vitest CLI filter
 * argument only narrows files already selected by config `include`/
 * `exclude`, it can never un-exclude them. Passing
 * `test/**\/*.int.test.ts` straight to `vitest run` against the main
 * config was therefore always a no-op ("No test files found"); this
 * config exists so `test:int` has its own `include` instead.
 */
export default defineConfig({
  test: {
    include: ["test/**/*.int.test.ts"],
  },
});
