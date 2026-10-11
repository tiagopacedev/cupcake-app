import { defineConfig } from "vitest/config";

/**
 * 05-testing-strategy.md §4. No hard per-package threshold here yet: the
 * doc's named target, `apps/api/src/services` ≥ 90%, doesn't exist until
 * E4+ adds a services layer — add a `thresholds: { "src/services/**": {
 * lines: 90 } }` entry then. `json-summary` feeds `scripts/check-
 * coverage.mjs`'s whole-repo ≥75% check in the meantime.
 */
export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/*.int.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: ["src/**/*.ts"],
    },
  },
});
