import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 05-testing-strategy.md §4: `json-summary` feeds `scripts/check-
// coverage.mjs`'s whole-repo ≥75% check. No per-package threshold named
// for `apps/web` specifically.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/lib/api/schema.d.ts"],
    },
  },
});
