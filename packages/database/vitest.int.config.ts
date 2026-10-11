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
    // These files share one real, mutable Postgres database (no per-test
    // transaction rollback or schema isolation) and some fixtures collide
    // across files on purpose — e.g. constraints.int.test.ts's fixture
    // category and seed.int.test.ts's real "classics" category both use
    // name 'Clássicos'/slug 'classics'. Vitest's default parallel-file
    // execution interleaved their truncate/insert calls and produced
    // spurious unique-constraint and foreign-key failures that have
    // nothing to do with the code under test. Forcing one file at a time
    // removes the race; each file's own beforeEach still isolates its
    // tests from each other via truncateAll.
    fileParallelism: false,
  },
});
