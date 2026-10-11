#!/usr/bin/env node
// Whole-repo line coverage gate (05-testing-strategy.md §4: "Line coverage,
// whole repo ≥ 75%"). Each package's own `test:coverage` script already
// enforces its own threshold where one is named (packages/shared ≥ 90%,
// via that package's vitest.config.ts); this script sums lines
// covered/total across every package's `coverage/coverage-summary.json`
// (the `json-summary` reporter each vitest.config.ts enables) and fails if
// the repo-wide percentage drops below the gate — a weighted rollup, not an
// average of each package's own percentage, so a small, well-covered
// package can't hide a large, poorly-covered one.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_WIDE_THRESHOLD = 75;
// `--soft`: report but never fail. Used only by `.github/workflows/ci.yml`
// right now — most business logic (E4-E7) doesn't exist yet, so the repo-
// wide figure is naturally far below 75% and a hard gate today would block
// every PR until much later phases, not just a badly-tested one. Flip
// ci.yml back to the strict default (just delete `-- --soft` there) once
// coverage is realistically near the gate — see docs/08-execution-plan.md
// E3-01's tracker note. Local `pnpm test:coverage` stays strict by default
// so a developer sees the real, undiluted signal.
const SOFT = process.argv.includes("--soft");

const PACKAGES = ["packages/shared", "packages/database", "apps/api", "apps/web"];

let totalLines = 0;
let coveredLines = 0;
const perPackage = [];

for (const pkg of PACKAGES) {
  const summaryPath = join(pkg, "coverage", "coverage-summary.json");
  let summary;
  try {
    summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  } catch {
    console.warn(
      `[check-coverage] skipping ${pkg}: no ${summaryPath} (run its test:coverage first)`,
    );
    continue;
  }
  const { total, covered } = summary.total.lines;
  totalLines += total;
  coveredLines += covered;
  perPackage.push({ pkg, pct: total === 0 ? 100 : (covered / total) * 100, total, covered });
}

if (totalLines === 0) {
  console.error(
    "[check-coverage] no coverage-summary.json found in any package — did test:coverage run?",
  );
  process.exit(1);
}

const repoPct = (coveredLines / totalLines) * 100;

console.log("Line coverage by package:");
for (const p of perPackage) {
  console.log(`  ${p.pkg.padEnd(20)} ${p.pct.toFixed(2)}%  (${p.covered}/${p.total})`);
}
console.log(
  `  ${"TOTAL (whole repo)".padEnd(20)} ${repoPct.toFixed(2)}%  (${coveredLines}/${totalLines})`,
);

if (repoPct < REPO_WIDE_THRESHOLD) {
  const message = `whole-repo line coverage ${repoPct.toFixed(2)}% is below the ${REPO_WIDE_THRESHOLD}% gate (05-testing-strategy.md §4).`;
  if (SOFT) {
    console.warn(`\n[check-coverage] ${message} (soft mode: not failing the build)`);
    process.exit(0);
  }
  console.error(`\n[check-coverage] ${message}`);
  process.exit(1);
}

console.log(
  `\n[check-coverage] whole-repo line coverage ${repoPct.toFixed(2)}% meets the ${REPO_WIDE_THRESHOLD}% gate.`,
);
