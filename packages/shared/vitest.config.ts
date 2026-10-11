import { defineConfig } from "vitest/config";

/**
 * 05-testing-strategy.md §4: line coverage for `packages/shared` ≥ 90%.
 * `json-summary` feeds `scripts/check-coverage.mjs`'s whole-repo ≥75% check
 * (run across every package after `pnpm test:coverage`, 06-development-
 * workflow.md §4 `quality`/`test` jobs).
 */
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      thresholds: {
        lines: 90,
      },
    },
  },
});
