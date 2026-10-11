# 06 · Development Workflow

| | |
|---|---|
| **Version** | 1.1 (11 Oct 2026, D-23: one Vercel project with Services) |
| **Status** | Draft for approval |
| **Related** | [CLAUDE.md](../CLAUDE.md) · [02-architecture.md](02-architecture.md) §10 (environments) · [05-testing-strategy.md](05-testing-strategy.md) · [01-prd.md](01-prd.md) §9 (backlog) |

How work moves from a backlog item to production: local setup, branching, commits, CI, database migrations and seed, deployment and the release checklist. It applies to human and AI-assisted (Claude Code) work alike.

---

## 1. Local setup

Prerequisites: Node.js 24 LTS (`.nvmrc`), pnpm 10 (`corepack enable`), Docker.

```bash
git clone <repo> && cd cupcake-app
corepack enable && pnpm install
cp .env.example .env              # local values; never commit .env
docker compose up -d db           # postgres:16 on localhost:5432 (cupcake_dev + cupcake_test)
pnpm db:migrate                   # prisma migrate dev (applies migrations, generates the client)
pnpm db:seed                      # six products, categories, tag
pnpm dev                          # web :3000 and api :4000 in parallel
```

### Integration tests

`pnpm test:int` truncates every table, so it **refuses any database whose name does not contain `test`**. Your `.env` points at `cupcake_dev` (or, if you copied production values, at Neon), so give the run the test database explicitly:

```bash
export DATABASE_URL=postgresql://cupcake:cupcake@localhost:5432/cupcake_test?sslmode=disable
export DIRECT_URL=$DATABASE_URL
pnpm db:deploy && pnpm test:int
```

### End-to-end tests

`pnpm test:e2e` builds and starts the API (port 4100) and the web app (port 3100) itself, in a production build, and resets and re-seeds the test database before every test (one worker, mobile and desktop projects). It needs the Docker database and, like the integration tests, refuses a database whose name lacks `test`:

```bash
export E2E_DATABASE_URL=postgresql://cupcake:cupcake@localhost:5432/cupcake_test?sslmode=disable
export DATABASE_URL=$E2E_DATABASE_URL DIRECT_URL=$E2E_DATABASE_URL
pnpm db:deploy
pnpm --filter e2e exec playwright install chromium   # once
pnpm test:e2e
```

Stop `pnpm dev` first: the E2E build writes the same `apps/web/.next` folder. Screenshots and axe results land in `e2e/artifacts/` (gitignored; CI uploads them as the `e2e-evidence` artifact), the HTML report in `e2e/playwright-report/`. In CI the `e2e` job runs on pushes to `main` and on PRs labeled `e2e`.

### Root scripts

| Script | Does |
|---|---|
| `pnpm dev` | Runs `apps/web` and `apps/api` in watch mode |
| `pnpm build` | Builds all packages (shared → database → api, web) |
| `pnpm lint` · `pnpm format` · `pnpm typecheck` | ESLint, Prettier (check), `tsc --noEmit` in every package |
| `pnpm test` | Unit + component tests |
| `pnpm test:int` | API integration, contract and database tests (needs the Docker DB, see below) |
| `pnpm test:e2e` | Playwright journeys, overflow, axe and screenshots against a production build (see below) |
| `pnpm db:migrate` / `db:deploy` / `db:seed` / `db:reset` | Prisma migrate dev / migrate deploy / seed / reset (local only) |
| `pnpm --filter web gen:api` | Regenerate `src/lib/api/schema.d.ts` from `docs/openapi.yaml` |

## 2. Branching and pull requests

**GitHub Flow.** `main` is always deployable and protected (PR required, CI green, linear history).

| Branch | Naming | Example |
|---|---|---|
| Story | `feat/us-<nn>-<slug>` | `feat/us-15-place-order` |
| Fix | `fix/<slug>` or `fix/us-<nn>-<slug>` | `fix/us-19-stock-notice` |
| Docs | `docs/<slug>` | `docs/api-spec-errors` |
| Chore / CI | `chore/<slug>` | `chore/ci-postgres-service` |

One backlog item per branch, in backlog order (PRD §9). Each PR:

- Title in Conventional Commits form, referencing IDs: `feat(api): reserve stock on order creation (US-15, BR-11)`.
- Description: story/rules covered, AC checklist with the test for each, screenshots at 390 and 1280 px for UI changes (CLAUDE.md §6a), docs updated (yes/no).
- Squash-merged into `main` after CI passes and a self-review against the Definition of Done (CLAUDE.md §8).

## 3. Commits

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary (IDs)`.

- Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`, `build`.
- Scopes: `web`, `api`, `db`, `shared`, `e2e`, `docs`, `ci`.
- Examples: `test(api): concurrency for last unit (US-15 AC4)`, `docs(prd): clarify BR-19 today rule`.

## 4. Continuous integration (GitHub Actions)

Workflow `.github/workflows/ci.yml` on every push and PR:

| Job | Steps |
|---|---|
| `quality` | checkout · setup Node 24 + pnpm cache · `pnpm install --frozen-lockfile` · lint · format check · typecheck · Redocly lint of `openapi.yaml` · `gen:api` diff check |
| `test` | services: `postgres:16` · `pnpm db:deploy` (test DB) · `pnpm test` · `pnpm test:int` · coverage thresholds (05 §4) · upload coverage summary |
| `e2e` (on `main` and PRs labeled `e2e`) | build web + api · seed test DB · `pnpm test:e2e` (mobile + desktop projects) · upload Playwright report on failure |
| `audit` | `pnpm audit --prod` (non-blocking warning) |

A PR can merge only when `quality` and `test` are green.

## 5. Database migrations and seed

| Rule | Detail |
|---|---|
| Source of truth | `packages/database/prisma/schema.prisma` + migrations; must stay equivalent to `docs/diagrams/database/physical-model.sql` (schema-diff test) |
| CHECK constraints | Added in a hand-written SQL migration copied from `physical-model.sql` (Prisma can't express them) |
| Creating a migration | `pnpm db:migrate --name <change>` locally; commit the generated folder; update `03-data-model.md` and the DDL in the same PR |
| Never edit | An applied migration. Fix forward with a new one. |
| Production / preview | `prisma migrate deploy` with `DIRECT_URL`, run by the release workflow **before** promoting the deployment; never on app start |
| Seed | `pnpm db:seed`, idempotent upsert by slug (categories, tag, six products). Creates products with seed stock only if they don't exist; **never resets stock** of existing products. |
| Resetting stock for user tests | Explicit script `pnpm db:restock -- --env=preview` (sets seed stock values); production only with a written note in `docs/situacao-3/` |
| Production data | No real customer data in seeds or fixtures; testers may use fictitious names (R-06) |

## 6. Environments and deployment

| Environment | How it's deployed | Database |
|---|---|---|
| Preview | Vercel Git integration: every PR builds one `cupcake-app` preview (both Services, one domain) — `web`'s `API_URL` comes from the Services binding, not a per-PR value | Neon branch `preview` (migrated and seeded by hand when a migration lands; the release workflow targets production only) |
| Production | Merge to `main` → Vercel production deployment of `cupcake-app` (both Services) | Neon `main` |

Vercel project (D-23, `vercel.json` at repo root — one project, two Services):

| Service | Root directory | Build | Env vars |
|---|---|---|---|
| `web` | `apps/web` | Next.js (zero-config) | `NEXT_PUBLIC_SITE_URL`; `API_URL` via Services binding to `api` |
| `api` | `apps/api` | Fastify zero-config (entry `src/index.ts`, compiled by Vercel itself). `apps/api` deliberately has no `build` script (it's `build:dist`): with one, Vercel deploys our `tsc` output flattened to the function root, away from `node_modules`, and the function can't load | `DATABASE_URL`, `WEB_ORIGIN`, `LOG_LEVEL` |

Release workflow (`.github/workflows/release.yml`, manual `workflow_dispatch` with a `version` input, run after Vercel has deployed `main`): `prisma migrate deploy` (production `DIRECT_URL` from the GitHub secret of the same name) → `pnpm db:seed` (idempotent) → smoke check `GET /api/health` through the web origin until `database` is `ok` → create and push tag `vX.Y.Z`. The tag is an output of the workflow, never its trigger. Rollback: Vercel Instant Rollback for code; migrations are additive (fix forward).

Secrets live in Vercel and GitHub only; `.env.example` lists every variable without values.

Workspace packages consumed at runtime by `api` (`shared`, `database`) export compiled `dist/` output, built on `pnpm install` (`postinstall`): Node on Vercel can't run their TypeScript sources. After changing either package locally, rebuild it (`pnpm --filter <pkg> build`) or re-run `pnpm install`.

Neon `main`'s migration history was baselined on 11 Oct 2026 (`prisma migrate resolve --applied` for the two E2 migrations, which had been applied by hand), so `migrate deploy` only applies new migrations from here on. Neon `preview` was empty and got `migrate deploy` + seed the same day.

## 7. Working with Claude Code

1. Pick the next backlog item (PRD §9). Create the branch.
2. Ask Claude Code to restate the story, list files to touch and tests to write (CLAUDE.md §9), referencing the docs.
3. Implement test-first where practical (service tests, then route integration test, then UI).
4. For UI: compare with `docs/design/screenshots/` at 390/1280 px before marking done.
5. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int` locally.
6. Open the PR with the AC checklist; merge when CI is green.
7. Log actual hours per task (R-02 tracking) in the PR description.

## 8. Versioning and change control

- App versions: `v0.1.0` walking skeleton (24 Oct), `v0.x` during P5, `v1.0.0` feature complete (3 Nov), `v1.0.x` fixes after validation.
- Documentation: each doc has a version and change log; behavior changes update the owning doc in the same PR (CLAUDE.md §3.3).
- Scope changes go to the PRD first (new or changed BR/US), then code.

## 9. Release checklist

- [ ] CI green on `main`; coverage thresholds met
- [ ] `prisma migrate deploy` applied to production; `GET /api/health` returns ok
- [ ] Seed present (six products, correct stock for the planned tests)
- [ ] E2E journeys pass against production (E2E-1…E2E-5)
- [ ] Visual comparison with approved screens at 390 / 1280 px
- [ ] axe: no serious/critical violations; Lighthouse mobile targets met (05 §4)
- [ ] Copy matches UI doc §9; no payment UI anywhere (NFR-12)
- [ ] No secrets in the repo; `.env.example` up to date
- [ ] README live links (web, API health, repository) work logged out
- [ ] Tag created and change logs updated

## 10. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 11 Oct 2026 | Initial workflow: setup, scripts, GitHub Flow, Conventional Commits, CI jobs, migrations and seed policy, Vercel/Neon deployment, Claude Code loop, release checklist |
| 1.1 | 11 Oct 2026 | D-23: one Vercel project (`cupcake-app`) with `web`/`api` Services instead of two projects |
| 1.2 | 11 Oct 2026 | E3-03: release workflow is `workflow_dispatch` only (migrate → seed → smoke → tag); runtime packages ship `dist/`; Neon migration history baselined |
| 1.3 | 11 Oct 2026 | E4: how to run `test:int` against `cupcake_test` |
| 1.4 | 11 Oct 2026 | E8: how to run `test:e2e` locally and what the CI `e2e` job does |
