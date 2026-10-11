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
    // Only one int test file today (health.int.test.ts), but it shares the
    // same real, mutable Postgres database as packages/database's int
    // tests run just before it (06-development-workflow.md §4's CI order) —
    // see packages/database/vitest.int.config.ts's comment for the exact
    // cross-file race this avoided there. Setting it here too so a future
    // second file in this package doesn't reintroduce it.
    fileParallelism: false,
  },
});
