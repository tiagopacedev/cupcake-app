# 06 · Development Workflow

| | |
|---|---|
| **Version** | 1.9 (18 Oct 2026) |
| **Related** | [02-architecture.md](02-architecture.md) §10 (environments) · [05-testing-strategy.md](05-testing-strategy.md) · [01-prd.md](01-prd.md) §9 (backlog) |

How work moves from a backlog item to production: local setup, conventions, branching, CI, database migrations, deployment and the release checklist.

---

## 1. Local setup

Prerequisites: Node.js 24 LTS (`.nvmrc`), pnpm 10 (`corepack enable`), Docker.

```bash
git clone <repo> && cd cupcake-app
corepack enable && pnpm install
cp .env.example .env              # at the repo root; never commit it
docker compose up -d db           # postgres:16 on localhost:5432 (cupcake_dev + cupcake_test)
pnpm db:migrate                   # apply migrations, generate the Prisma client
pnpm db:seed                      # categories, tag, six products
pnpm dev                          # web :3000 and api :4000 in parallel
```

The root `.env` is read by the API dev server and the `db:*` scripts. For development it must point at the **local Docker database** (`localhost:5432/cupcake_dev`, `WEB_ORIGIN=http://localhost:3000`), never at Neon: `pnpm dev` creates real orders and the API expires them (BR-20). Without a `.env` or shell variables the API stops at startup with `Invalid environment configuration`.

### Integration tests

`pnpm test:int` empties every table, so it **refuses any database whose name does not contain `test`**. Point it at the test database explicitly:

```bash
export DATABASE_URL=postgresql://cupcake:cupcake@localhost:5432/cupcake_test?sslmode=disable
export DIRECT_URL=$DATABASE_URL
pnpm db:deploy && pnpm test:int
```

### End-to-end tests

`pnpm test:e2e` builds and starts the API (port 4100) and the web app (port 3100) in production mode, and resets and re-seeds the test database before every test (one worker; mobile and desktop projects):

```bash
export E2E_DATABASE_URL=postgresql://cupcake:cupcake@localhost:5432/cupcake_test?sslmode=disable
export DATABASE_URL=$E2E_DATABASE_URL DIRECT_URL=$E2E_DATABASE_URL
pnpm db:deploy
pnpm --filter e2e exec playwright install chromium   # once
pnpm test:e2e
```

Stop `pnpm dev` first: the E2E build writes the same `apps/web/.next` folder. Screenshots and axe results land in `e2e/artifacts/` (gitignored); the HTML report in `e2e/playwright-report/`.

### Root scripts

| Script | Does |
|---|---|
| `pnpm dev` | Runs `apps/web` and `apps/api` in watch mode |
| `pnpm build` | Builds all packages (shared → database → api, web) |
| `pnpm lint` · `pnpm format` · `pnpm typecheck` | ESLint, Prettier (check), `tsc --noEmit` in every package |
| `pnpm test` | Unit and component tests |
| `pnpm test:int` | API integration, contract and database tests (needs the Docker database) |
| `pnpm test:e2e` | Playwright journeys, overflow, axe and screenshots against a production build |
| `pnpm db:migrate` / `db:deploy` / `db:seed` / `db:reset` | Prisma migrate dev / migrate deploy / seed / reset (local only) |
| `pnpm --filter web gen:api` | Regenerate `apps/web/src/lib/api/schema.d.ts` from `docs/openapi.yaml` |

The workspace packages `shared` and `database` are consumed as compiled `dist/` output, built on `pnpm install`. After changing either one, rebuild it (`pnpm --filter <pkg> build`).

## 2. Branching and pull requests

**GitHub Flow.** `main` is always deployable and protected (PR required, CI green, linear history).

| Branch | Naming | Example |
|---|---|---|
| Story | `feat/us-<nn>-<slug>` | `feat/us-15-place-order` |
| Fix | `fix/<slug>` or `fix/us-<nn>-<slug>` | `fix/us-19-stock-notice` |
| Docs | `docs/<slug>` | `docs/api-spec-errors` |
| Chore / CI | `chore/<slug>` | `chore/ci-postgres-service` |

One backlog item per branch, in backlog order (PRD §9). Each PR has a Conventional Commits title with IDs (`feat(api): reserve stock on order creation (US-15, BR-11)`), lists the acceptance criteria with the test that covers each, includes screenshots at 390 and 1280 px for UI changes, and says which docs changed. PRs are squash-merged after CI passes.

## 3. Conventions, commits and Definition of Done

### Working rules

- **The docs are the spec.** Implement only what the PRD, UI doc and API contract define. If something isn't specified, decide it in the docs first.
- **Docs and code change together.** A behavior change updates the owning document in the same PR, with a change-log line.
- **Single source of truth.** Reference IDs (BR-05, US-11) instead of copying rules between files.
- **Simplest design that satisfies the spec.** No abstractions only to demonstrate patterns.
- **Money is integer cents; the server is the authority** for prices, totals and stock (BR-07, BR-11).
- **Privacy:** never log or return phone numbers; public views show the first name only (BR-16).
- **Naming:** `camelCase` variables and functions, `PascalCase` types and components, `kebab-case` files, `SCREAMING_SNAKE_CASE` enum values and error codes. TypeScript `strict`.
- **UI:** build to the approved design (`04-ui-design-system.md`, `docs/design/`) with standard Tailwind and shadcn/ui; user-facing text comes from the UI doc copy deck (pt-BR).

### Commits

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary (IDs)`.

- Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`, `build`.
- Scopes: `web`, `api`, `db`, `shared`, `e2e`, `docs`, `ci`.
- Examples: `test(api): concurrency for last unit (US-15 AC4)`, `docs(prd): clarify BR-19`.

### Definition of Done

- [ ] Implements exactly the referenced stories and rules, nothing extra
- [ ] Acceptance criteria satisfied, each covered by a test or a documented manual check
- [ ] Lint, type check and all tests pass locally and in CI
- [ ] Loading, empty and error states handled where relevant
- [ ] UI copy matches `04-ui-design-system.md` (pt-BR)
- [ ] Screens compared with `docs/design/screenshots/` at 390 and 1280 px
- [ ] Docs updated if behavior or contracts changed
- [ ] No personal data in logs; no secrets committed

## 4. Continuous integration (GitHub Actions)

Workflow `.github/workflows/ci.yml` on every push and PR:

| Job | Steps |
|---|---|
| `quality` | install · lint · format check · typecheck · Redocly lint of `openapi.yaml` · `gen:api` diff check |
| `test` | `postgres:16` service · `pnpm db:deploy` · `pnpm test` · `pnpm test:int` · coverage thresholds (05 §4) |
| `e2e` (every PR and push to `main`) | `pnpm test:e2e` (mobile and desktop) · upload the Playwright report and evidence |
| `audit` | `pnpm audit --prod` (warning only) |

A PR can merge only when `quality` and `test` are green.

## 5. Database migrations and seed

| Rule | Detail |
|---|---|
| Source of truth | `packages/database/prisma/schema.prisma` plus migrations, kept equivalent to `docs/diagrams/database/physical-model.sql` (schema-diff test) |
| CHECK constraints | Added in hand-written SQL migrations copied from `physical-model.sql` (Prisma can't express them) |
| New migration | `pnpm db:migrate --name <change>` locally; commit the folder; update `03-data-model.md` and the DDL in the same PR |
| Applied migrations | Never edited once applied to a shared environment; fix forward with a new one |
| Production and preview | `prisma migrate deploy` with `DIRECT_URL`, run by the release workflow before promoting; never on app start |
| Seed | `pnpm db:seed`: idempotent upsert by slug (categories, tag, six products). Seed stock is set only when a product is created; existing stock is never reset |
| Production data | No real customer data in seeds or fixtures; testers may use fictitious names (R-06). Changing production stock or orders needs the owner's written approval in `docs/situacao-3/` |

Migration `20261018000001_order_schedule_and_expiry` adds `orders.ready_at`/`expires_at` and the `EXPIRED` status, and backfills existing orders (ready = created + 15 min; expires at 19:00 São Paulo time of the ready day, or of the next day when that has passed). **Orders created before it therefore expire on the first API request after it, and their stock returns to the catalog.**

## 6. Environments and deployment

| Environment | How it's deployed | Database |
|---|---|---|
| Local | `pnpm dev` | Docker `cupcake_dev` (tests: `cupcake_test`) |
| Preview | Vercel builds every PR (both services, one domain) | Neon branch `preview`, migrated and seeded by hand when a migration lands |
| Production | Merge to `main` → Vercel production deployment | Neon `main` |

One Vercel project with two services (D-23, `vercel.json`):

| Service | Root directory | Build | Environment variables |
|---|---|---|---|
| `web` | `apps/web` | Next.js | `NEXT_PUBLIC_SITE_URL`; `API_URL` from the Services binding |
| `api` | `apps/api` | Fastify, entry `src/index.ts`, compiled by Vercel (the package deliberately has no `build` script, only `build:dist`) | `DATABASE_URL`, `WEB_ORIGIN`, `LOG_LEVEL`, `STAFF_API_TOKEN` |

**Release workflow** (`.github/workflows/release.yml`, run by hand with a `version` input after Vercel deploys `main`): `prisma migrate deploy` → `pnpm db:seed` → smoke check of `GET /api/health` and of one product photo → create and push the tag `vX.Y.Z`. Rollback: Vercel Instant Rollback for code; migrations are additive (fix forward).

**Secrets** live only in Vercel and GitHub; `.env.example` lists every variable without values. `STAFF_API_TOKEN` (BR-21, at least 32 characters, e.g. `openssl rand -hex 32`) is set per environment; without it the staff endpoint answers `401` to everyone. Staff mark an order as picked up with:

```bash
curl -X PATCH -H "Authorization: Bearer $STAFF_API_TOKEN" https://<domain>/api/orders/CUP-XXXXXX/pickup
```

## 7. Working on a task

1. Pick the next item in the execution plan (08) whose dependencies are done; create the branch.
2. Restate the story, the files to touch and the tests to write, from the referenced docs.
3. Implement test-first where practical: service tests, then route integration tests, then UI.
4. For UI, compare with `docs/design/screenshots/` at 390 and 1280 px.
5. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int`.
6. Open the PR with the acceptance-criteria checklist; merge when CI is green and the Definition of Done (§3) holds.

## 8. Versioning and change control

- App versions: `v0.1.0` walking skeleton, `v0.x` during implementation, `v1.0.0` first release (17 Oct 2026), `v1.1.0` fixes from user validation.
- Each document has a version and a change log; behavior changes update the owning doc in the same PR.
- Scope changes go to the PRD first (new or changed BR/US), then to code.

## 9. Release checklist

- [ ] CI green on `main`; coverage thresholds met
- [ ] `prisma migrate deploy` applied to production; `GET /api/health` returns ok
- [ ] Seed present (six products, correct stock for the planned tests)
- [ ] `STAFF_API_TOKEN` set; staff pickup checked with `curl` (200, then 409; 401 without the header)
- [ ] E2E journeys pass (E2E-1…E2E-5)
- [ ] Visual comparison with the approved screens at 390 / 1280 px
- [ ] axe: no serious or critical violations; Lighthouse mobile targets met (05 §4)
- [ ] Copy matches UI doc §9; no payment UI anywhere (NFR-12)
- [ ] No secrets in the repo; `.env.example` up to date
- [ ] README live links work logged out
- [ ] Tag created and change logs updated

## 10. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 11 Oct 2026 | Initial workflow: setup, scripts, GitHub Flow, Conventional Commits, CI, migrations and seed policy, Vercel/Neon deployment, release checklist |
| 1.1 | 11 Oct 2026 | One Vercel project with `web`/`api` services (D-23) |
| 1.2 | 11 Oct 2026 | Release workflow run by hand (migrate → seed → smoke → tag); runtime packages ship `dist/` |
| 1.3 | 11 Oct 2026 | How to run `test:int` against `cupcake_test` |
| 1.4 | 11 Oct 2026 | How to run `test:e2e` locally; the CI `e2e` job |
| 1.5 | 11 Oct 2026 | Release smoke test checks a product photo |
| 1.6 | 18 Oct 2026 | `STAFF_API_TOKEN` and the staff pickup call; the expiry migration and its backfill |
| 1.7 | 18 Oct 2026 | The root `.env` is read by the API dev server and the `db:*` scripts and must point at the local database |
| 1.8 | 18 Oct 2026 | Documentation review: conventions and Definition of Done moved here (§3); neutral task workflow (§7); removed a stock-reset script that was never built |
| 1.9 | 18 Oct 2026 | CI: the `e2e` job runs on every PR (it was limited to pushes to `main` and PRs labeled `e2e`); Prisma 7.10.1 clears the `pnpm audit --prod` findings |
