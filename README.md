# Cupcake Store

A mobile-first web store for a cupcake shop. Customers browse the catalog, fill a cart, place an order with just a name and phone number, and then pick up and pay at the store.

Built for the Software Engineering course project (PIT II) using **spec-driven development**: requirements, business rules, data model, API contract and UI are specified in [`docs/`](docs/) first, and the code implements them.

- **Live app:** https://cupcake-app-iota.vercel.app
- **API health:** https://cupcake-app-iota.vercel.app/api/health

## Features

- Catalog with category filters, stock states and a quantity selector on each card
- Cart kept in the browser
- Checkout with name and phone only; no account, no online payment
- Order page with a pickup code, ready time and pickup deadline
- Home page cards for the customer's active orders, and a share button for the order link
- Orders expire at closing time and release their stock; staff mark handed-over orders through a protected API

## Tech stack

| Layer | Technology |
|---|---|
| Front-end | Next.js, React, Tailwind CSS, shadcn/ui |
| Back-end | Node.js, TypeScript, Fastify (MVC: routes, controllers, services, repositories) |
| Database | PostgreSQL with Prisma ORM |
| Tests | Vitest, Testing Library, Playwright |
| Hosting | Vercel (web and API), Neon (PostgreSQL) |

## Run it locally

Requires Node.js 24, pnpm 10 and Docker.

```bash
corepack enable && pnpm install
cp .env.example .env        # local database values; never commit .env
docker compose up -d db     # PostgreSQL on localhost:5432
pnpm db:migrate             # apply migrations
pnpm db:seed                # load the catalog
pnpm dev                    # web on :3000, API on :4000
```

| Command | Purpose |
|---|---|
| `pnpm test` | Unit and component tests |
| `pnpm test:int` | API and database integration tests (needs the database) |
| `pnpm test:e2e` | End-to-end tests in a browser |
| `pnpm lint` · `pnpm typecheck` | Static checks |

## Documentation

Start with [`docs/00-project-overview.md`](docs/00-project-overview.md): it explains the project, the decisions taken and how the other documents fit together. Development workflow, CI and releases are in [`docs/06-development-workflow.md`](docs/06-development-workflow.md).


