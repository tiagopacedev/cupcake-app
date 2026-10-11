import { defineConfig } from "vitest/config";

/**
 * 05-testing-strategy.md §4: `src/services` must keep >= 90% line coverage
 * (enforced below). `json-summary` feeds `scripts/check-coverage.mjs`'s
 * whole-repo >= 75% check.
 */
export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/*.int.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: ["src/**/*.ts"],
      thresholds: { "src/services/**": { lines: 90 } },
    },
  },
});
