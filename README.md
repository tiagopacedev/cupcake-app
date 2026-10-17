# Cupcake Store

Mobile-first web store for a cupcake shop: browse, add to cart, check out with just a name and phone, and pick up (and pay) at the counter. Built for the PIT II (Software Engineering) course as a spec-driven, AI-assisted project — see [`docs/00-project-overview.md`](docs/00-project-overview.md).

**Status:** **v1.0.0 released** (17 Oct 2026): the full customer journey is live. Next: validation with real users (E9) — see `docs/08-execution-plan.md` §16.

## Documentation

Start at [`CLAUDE.md`](CLAUDE.md) for the working rules, then [`docs/00-project-overview.md`](docs/00-project-overview.md) for context, decisions and schedule. Full doc map there (§5).

## Local setup

Prerequisites: Node.js 24 LTS (`.nvmrc`), pnpm 10 (`corepack enable`), Docker.

```bash
git clone <repo> && cd cupcake-app
corepack enable && pnpm install
cp .env.example .env              # local values; never commit .env
docker compose up -d db           # postgres:16 on localhost:5432 (cupcake_dev + cupcake_test)
pnpm db:migrate                   # prisma migrate dev (from E2 onward)
pnpm db:seed                      # six products, categories, tag (from E2 onward)
pnpm dev                          # web :3000 and api :4000 in parallel
```

### Root scripts

| Script | Does |
|---|---|
| `pnpm dev` | Runs `apps/web` and `apps/api` in watch mode |
| `pnpm build` | Builds all packages (shared → database → api, web) |
| `pnpm lint` · `pnpm format` · `pnpm typecheck` | ESLint, Prettier (check), `tsc --noEmit` in every package |
| `pnpm test` | Unit + component tests |
| `pnpm test:int` | API integration tests (needs the database running) |
| `pnpm test:e2e` | Playwright journeys (from E8) |
| `pnpm db:migrate` / `db:deploy` / `db:seed` / `db:reset` | Prisma commands (from E2) |

Full workflow (branching, commits, CI, releases): [`docs/06-development-workflow.md`](docs/06-development-workflow.md).

## Live links

- Web: https://cupcake-app-iota.vercel.app
- API health: https://cupcake-app-iota.vercel.app/api/health
- Repository: https://github.com/tiagopacedev/cupcake-app

## AI assistance disclosure

This repository is built with AI-assisted, specification-driven development: requirements, models and conventions are written first (`docs/`), and Claude Code implements against them under the rules in [`CLAUDE.md`](CLAUDE.md). See `docs/00-project-overview.md` A-06.
