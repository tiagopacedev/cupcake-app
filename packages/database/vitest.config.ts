import { defineConfig } from "vitest/config";

/**
 * 05-testing-strategy.md §4. `json-summary` feeds `scripts/check-
 * coverage.mjs`'s whole-repo ≥75% check. Most of this package's real
 * coverage comes from `test/*.int.test.ts` (schema-diff, constraints,
 * seed), which run separately via `test:int` against a real Postgres, not
 * through this config.
 */
export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/*.int.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/generated/**"],
    },
  },
});
