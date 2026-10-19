# 02 · Architecture

| | |
|---|---|
| **Version** | 1.6 (18 Oct 2026) |
| **Related** | [01-prd.md](01-prd.md) (BR, NFR) · [03-data-model.md](03-data-model.md) · [04-ui-design-system.md](04-ui-design-system.md) · [07-api-spec.md](07-api-spec.md) + [openapi.yaml](openapi.yaml) · [05-testing-strategy.md](05-testing-strategy.md) · [06-development-workflow.md](06-development-workflow.md) |

This document defines how the system is built: the MVC layering the course requires, the monorepo, the technology versions, the error model, security, configuration, environments and hosting. It is the reference for every implementation task.

---

## 1. Architectural drivers

| Driver | Source | Consequence |
|---|---|---|
| MVC structure, explainable to graders | Course (S-II), D-10 | Fastify API split into routes → controllers → services → repositories; Next.js is the View |
| Correct stock under concurrency | BR-05, BR-11, NFR-08 | Order creation in one PostgreSQL transaction with conditional stock decrement |
| Mobile-first, fast catalog | NFR-01, NFR-02 | Server-rendered catalog, optimized images, small client bundle |
| Spec-driven development | Overview §1, 06 §3 | Contract first (`openapi.yaml`), shared validation schemas, strict TypeScript, tests per BR |
| Privacy | BR-16, NFR-06 | No phone in responses or logs; first name only |
| Low cost, low ops, deadline 17 Nov | D-14, R-02, R-04 | Managed hosting with Git deploys and preview environments; no servers to maintain |

## 2. System context and containers

![Deployment diagram](diagrams/architecture/deployment-diagram.png)

| Container | Technology | Responsibility |
|---|---|---|
| **Web** (`apps/web`) | Next.js 16 (App Router), React, Tailwind CSS v4, shadcn/ui | **View**: pages SCR-01…SCR-05, cart and active-orders storage in the browser, formatting, calls the API |
| **API** (`apps/api`) | Node.js 24 LTS, Fastify 5, Zod | **Controller + Model**: HTTP contract, validation, business rules BR-01…BR-21, persistence |
| **Database** | PostgreSQL 16 (Neon) | Catalog, customers, orders; constraints from `physical-model.sql` |
| **Database package** (`packages/database`) | Prisma ORM 7 | Schema, migrations, seed, generated client |
| **Shared package** (`packages/shared`) | TypeScript + Zod | Validation schemas (BR-14), error codes, store configuration and pickup schedule (BR-12), phone utilities, shared types |

The browser talks only to the Web origin. The Web app proxies `/api/*` to the API (Next.js rewrite), so the browser never needs CORS and the API URL isn't exposed in client code.

## 3. MVC mapping

| MVC role | Where | Rules |
|---|---|---|
| **View** | `apps/web` pages and components | Renders data and collects input. No business rules: it never computes prices, totals or stock decisions that the server must confirm. It may apply UX limits (stepper max) that the server re-validates. |
| **Router** | `apps/api/src/routes/*.routes.ts` | Declares method, path, rate limit and route hooks (such as the staff token check), and wires the controller. Nothing else. |
| **Controller** | `apps/api/src/controllers/*.controller.ts` | Validates the input with the shared Zod schemas, calls **one** service method and maps the result to the HTTP response (status, headers, body). No business logic, no Prisma. |
| **Model: services** | `apps/api/src/services/*.service.ts` | Business rules (BR-xx), transactions, domain errors (`AppError` with a stable code). Plain TypeScript plus repository calls. |
| **Model: repositories** | `apps/api/src/repositories/*.repository.ts` | Prisma queries only. No HTTP knowledge, no business decisions. |

Request flow and error path: ![Request lifecycle](diagrams/architecture/request-lifecycle.png)

Logical packages: [package diagram](diagrams/class-diagram/package-diagram.svg).

## 4. Technology stack and versions

Versions are the current stable lines on 11 Oct 2026. Pin exact versions in `package.json` (no `^` on frameworks) and upgrade only on purpose.

| Concern | Choice | Version line | Notes |
|---|---|---|---|
| Runtime | Node.js | 24 LTS | Same version locally (`.nvmrc`), in CI and on Vercel |
| Package manager / monorepo | pnpm workspaces | 10.x | No Turborepo: four packages don't need it |
| Language | TypeScript | 5.9 | `strict`, `noUncheckedIndexedAccess` |
| Web framework | Next.js (App Router) | 16.x | Server Components for data pages, Client Components for interactive parts |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI primitives) + lucide-react + Sonner | latest stable | Theme only in `globals.css` (UI doc §4) |
| Client state | Zustand with `persist` | 5.x | Cart store; the active-orders store is a small typed wrapper over `localStorage` |
| API framework | Fastify | 5.x | With `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`. Input is validated with Zod in the controllers (a `ZodError` becomes `400 VALIDATION_ERROR` in the global handler); no type provider |
| Validation | Zod | 4.x | Shared schemas in `packages/shared` |
| ORM | Prisma ORM | 7.x (`@prisma/client` 7) | `prisma-client` generator, `@prisma/adapter-pg`, `prisma.config.ts`. **Not Prisma 8**: still a release candidate and lacks atomic `increment`/`decrement` and nested writes, which order creation uses. |
| Database | PostgreSQL | 16 | Neon in the cloud; Docker `postgres:16` locally and in CI |
| API client (web) | `openapi-typescript` + `openapi-fetch` | latest stable | Types generated from `docs/openapi.yaml` |
| Tests | Vitest, Testing Library, Playwright, `@axe-core/playwright` | latest stable | See `05-testing-strategy.md` |
| Lint / format | ESLint 9 (flat config) + typescript-eslint, Prettier | latest stable | Enforced in CI |
| Hosting | Vercel (web and API), Neon (database, through the Vercel Marketplace) | n/a | §10 |

## 5. Repository layout

```
cupcake-app/
├─ apps/
│  ├─ web/                          # Next.js · VIEW
│  │  ├─ src/app/
│  │  │  ├─ layout.tsx              # font, Toaster, cart hydration
│  │  │  ├─ globals.css             # copy of docs/design/theme/globals.css
│  │  │  ├─ page.tsx                # SCR-01 Catálogo (?filter=)
│  │  │  ├─ cart/page.tsx           # SCR-02
│  │  │  ├─ checkout/page.tsx       # SCR-03
│  │  │  ├─ orders/[code]/page.tsx  # SCR-04 Meu pedido (?new=1)
│  │  │  ├─ not-found.tsx · error.tsx   # SCR-05
│  │  ├─ src/components/ui/         # shadcn/ui primitives (unmodified)
│  │  ├─ src/components/            # AppHeader, ActiveOrderCards, FilterChips, ProductCard, CartLine, OrderSummary, …
│  │  ├─ src/lib/api/               # openapi-fetch client + generated schema.d.ts
│  │  ├─ src/lib/                   # cart-store.ts, recent-orders-store.ts, format.ts
│  │  ├─ public/images/products/    # six photos from docs/design/assets/photos
│  │  └─ next.config.ts             # rewrites /api/* → API_URL, security headers, images
│  └─ api/                          # Fastify · ROUTER + CONTROLLER + MODEL
│     └─ src/
│        ├─ index.ts                # Vercel entry: buildApp() + listen
│        ├─ build-app.ts            # buildApp(): plugins, routes, error handler (used by tests)
│        ├─ config.ts               # env parsing with Zod (fails fast)
│        ├─ plugins/                # prisma, security (helmet, cors, rate-limit), request-id, staff-auth
│        ├─ routes/                 # health, catalog (filters + products), orders
│        ├─ controllers/            # catalog, orders
│        ├─ services/               # catalog, order, order-expiry, stock, order-code
│        ├─ repositories/           # category, tag, product, customer, order
│        └─ errors/                 # AppError, error codes, global handler
├─ packages/
│  ├─ database/                     # Prisma schema, migrations (incl. raw CHECK constraints), seed.ts, prisma.config.ts
│  └─ shared/                       # zod schemas, error codes, store config, pickup schedule, phone utils, types
├─ docs/                            # this documentation (spec, design, diagrams)
├─ e2e/                             # Playwright tests (journey, visual, a11y)
├─ docker-compose.yml               # postgres:16 for local dev and integration tests
├─ .github/workflows/ci.yml
├─ README.md · .nvmrc · pnpm-workspace.yaml · tsconfig.base.json · eslint.config.mjs
```

Dependency rule: `web → shared`, `api → shared, database`, `database → (none)`, `shared → (none)`. The web app never imports `database`.

## 6. Key design decisions

### 6.1 Order creation (BR-10, BR-11, BR-15, BR-19)

`OrderService.create(input)` runs in **one interactive Prisma transaction** (default READ COMMITTED isolation):

1. Load the requested active products by id; missing or inactive → `PRODUCT_NOT_FOUND` (409).
2. For each line, ordered by product id (avoids deadlocks): `updateMany({ where: { id, stockQuantity: { gte: q } }, data: { stockQuantity: { decrement: q } } })`. Any `count = 0` → read current stock and throw `INSUFFICIENT_STOCK` (409) with `{ productId, requested, available }[]`; the transaction rolls back.
3. Upsert the customer by normalized phone (name updated).
4. Compute line totals and total from **database prices**.
5. Compute the pickup schedule with `computePickup` (`packages/shared`) from the store's opening hours (`STORE`, A-03): `readyAt` is the first moment at least the preparation time after the order, within opening hours, leaving the customer the preparation time before closing; `expiresAt` is that day's closing time (BR-12). An order placed while the store is closed is accepted. Insert the order (AWAITING_PICKUP) with `createdAt` (the service's clock), `readyAt`, `expiresAt` and the items with `unitPriceCents`.
6. On a unique violation of `orders.code` (Prisma `P2002`), retry the **whole** transaction with a new code, up to 5 times.

The conditional `UPDATE … WHERE stock_quantity >= q` is atomic in PostgreSQL, so two concurrent orders for the last units can't both succeed (US-15 AC4). Sequence: [SD-02](diagrams/sequence-diagrams/sd-02-place-order.svg).

Before this transaction, `OrderService.create` calls the expiry below, so the units of overdue orders are available to the customer.

### 6.1b Order expiry and staff pickup (BR-20, BR-21, D-25, D-26)

There is no background job (D-16), so expiry is **lazy**: `OrderExpiryService.expireOverdue()` runs first in every request that reads or changes stock or an order (`GET /api/products`, `POST /api/orders`, `GET /api/orders/{code}`, `PATCH …/pickup`).

1. `findFirst` on `orders(pickup_status, expires_at)`: nothing overdue → return (the usual case, one indexed query, no transaction).
2. Otherwise one transaction: `updateManyAndReturn({ where: { pickupStatus: AWAITING_PICKUP, expiresAt: { lte: now } }, data: { pickupStatus: EXPIRED } })`, then `groupBy` the lines of the returned orders by product and `increment` each product's stock, in product-id order (the same lock order as order creation).

The conditional `UPDATE` makes the release happen **exactly once**: a concurrent request waits for the row locks, re-evaluates the `WHERE` clause on the committed rows and no longer matches them. Picked-up orders are never touched.

`PATCH /api/orders/{code}/pickup` (`OrderService.markPickedUp`) expires overdue orders, loads the order and flips AWAITING_PICKUP → PICKED_UP with a conditional `updateMany`; `0` rows means another request won (answered as `409 INVALID_ORDER_STATUS` with the real status). The route's `preHandler` (`plugins/staff-auth.ts`) checks `Authorization: Bearer` against `STAFF_API_TOKEN` first.

The services take a clock (`now: () => Date`) so tests control time; `buildApp(config, { now })` passes it down.

### 6.2 Derived values

| Value | Computed by | Rule |
|---|---|---|
| `stockState` (`AVAILABLE`, `LOW`, `SOLD_OUT`) | CatalogService | LOW when 1–5 (A-02) |
| `readyAt`, `expiresAt` | OrderService (stored on the order) | `computePickup` from the store's opening hours, `STORE` (BR-12, BR-20) |
| `customerFirstName` | OrderService | First word of the stored name (BR-16) |
| Active orders of the browser | Web (`recent-orders-store.ts`) | Up to 5 stored codes whose order the API returns as AWAITING_PICKUP (BR-19) |

### 6.3 Store data (one config module)

The store (name, address, time zone, preparation time) and its weekly opening hours are one typed constant, `STORE` in `packages/shared/src/store.ts` (the placeholders of A-03). There is no admin panel, so changing them means editing that file and deploying (D-24).

- **API:** `OrderService` runs `computePickup` (`packages/shared/src/pickup-schedule.ts`) on `STORE` and stores `readyAt` and `expiresAt` on the order.
- **Web:** the header, footer, "Retirada" and "Onde retirar" read `STORE` directly, so they are part of the first paint and the pages stay static. The checkout runs the same `computePickup` for its ready label.
- **Why not database tables:** the testers' report suggested `Store` and `StoreOpeningHours` tables. They were built and then dropped (D-24): without an admin screen they cannot be edited any more easily than a config file, and they cost a cached endpoint, per-request rendering, a seed dependency and a client-side provider. If an admin screen is added later, the tables, an endpoint and a cache can come back without changing `computePickup`.
- `packages/shared/src/store.ts` also holds `DISPLAY_TIME_ZONE` (NFR-04), `MAX_LINE_QUANTITY`, `LOW_STOCK_THRESHOLD`, the `StoreInfo`/`OpeningHours` types and `formatOpeningHours`.

### 6.4 Rendering strategy (web)

| Page | Rendering | Data |
|---|---|---|
| `/` Catálogo | Server Component fetches filters and products (`cache: "no-store"`, stock changes) and passes them to client islands (cards with steppers, chips, active-order cards) | `GET /api/catalog/filters`, `GET /api/products` |
| `/cart` | Client Component | Cart store + `GET /api/products` refresh |
| `/checkout` | Client Component | Cart store, `POST /api/orders` |
| `/orders/[code]` | Server Component fetch + client islands (success notice for `?new=1`, copy and share buttons, pickup deadline) | `GET /api/orders/{code}` |

Filter changes use `router.replace("/?filter=…", { scroll: false })` and re-render on the server; products are few (6), so no client cache library is needed.

### 6.5 Images

Photos are static files in `apps/web/public/images/products/<slug>.jpg`; `Product.imageUrl` stores `/images/products/<slug>.jpg`. Rendered with `next/image` in **`unoptimized` mode** (`sizes="(min-width:1024px) 368px, 50vw"`, the first catalog row with `priority`): the browser fetches `/images/products/<slug>.jpg` directly. Next's `/_next/image` optimizer route returns 404 behind the Vercel Services routing (`vercel.json`), which broke every photo in production, and optimizing 512 px, ~30 KB JPEGs gains almost nothing. The release workflow checks that the first photo of the catalog loads.

## 7. Error model (NFR-07)

Every error response has the same shape (OpenAPI `ErrorResponse`):

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Not enough stock for one or more items.",
    "details": { "items": [{ "productId": "…", "requested": 2, "available": 1 }] },
    "requestId": "8f2c1b6e-…"
  }
}
```

- `code` is stable and listed below; the UI maps it to pt-BR copy (UI doc §9.5). `message` is English, for developers; the UI never displays it.
- `details` is optional and code-specific (`fields` for validation, `items` for stock, `productIds` for missing products, `pickupStatus` for an invalid status change).
- One global error handler: `AppError` → its status/code; Zod validation → `VALIDATION_ERROR`; rate-limit → `RATE_LIMITED`; anything else → `INTERNAL_ERROR` (logged with stack, never returned).

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body or query fails the schema (BR-14, BR-06) |
| `ORDER_NOT_FOUND` | 404 | Unknown or malformed order code |
| `NOT_FOUND` | 404 | Unknown route |
| `PRODUCT_NOT_FOUND` | 409 | An ordered product doesn't exist or is inactive |
| `INSUFFICIENT_STOCK` | 409 | Stock can't cover one or more lines (BR-05, BR-11) |
| `INVALID_ORDER_STATUS` | 409 | The order is not AWAITING_PICKUP, so staff cannot mark it as picked up (BR-21); `details.pickupStatus` |
| `UNAUTHORIZED` | 401 | Missing, wrong or unconfigured staff token (BR-21) |
| `RATE_LIMITED` | 429 | Too many requests (NFR-05) |
| `INTERNAL_ERROR` | 500 | Unexpected failure |

The list lives in `packages/shared/src/error-codes.ts` and in `openapi.yaml`; both must match (contract test).

## 8. Security and privacy (NFR-05, NFR-06)

| Measure | Implementation |
|---|---|
| Input validation | Zod schemas on every route (params, query, body); unknown body properties rejected |
| Server authority | Prices, totals and stock computed on the server only (BR-07, BR-11) |
| Rate limiting | `@fastify/rate-limit`: `POST /api/orders` 10/min per IP; other routes 120/min. In-memory per function instance (acceptable for the MVP; Vercel Firewall rules can add a global limit). Client IP from `x-forwarded-for` (`trustProxy: true`). |
| CORS | `@fastify/cors` allows only `WEB_ORIGIN` (the browser normally uses the same-origin rewrite) |
| Security headers | `@fastify/helmet` on the API; `next.config.ts` headers on the web (CSP with `self` + Google Fonts not needed when using `next/font`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) |
| HTTPS | Vercel terminates TLS; DB connections use TLS (`sslmode=require`) |
| Secrets | Only in Vercel/GitHub environment variables; `.env*` git-ignored; `.env.example` documents names |
| Logging | Fastify pino logger with `redact: ["req.body.customer.phone", "req.body.customer.name", "*.phone"]`; request id in every log line and in the `x-request-id` response header; no request bodies logged at info level |
| Public data | Order responses expose first name only, never phone or internal ids of customers/orders (BR-16) |
| Staff endpoint | `PATCH /api/orders/{code}/pickup` needs `Authorization: Bearer <STAFF_API_TOKEN>` (BR-21, D-26). The token comes from the environment (≥ 32 characters), both sides are SHA-256 hashed and compared with `timingSafeEqual`, it is never logged or echoed, and a server without a token rejects everyone with `401`. The route has the strict order rate limit (10/min per IP) and is not allowed by CORS, so a web page cannot call it. |
| Enumeration | Order codes have 31⁶ possibilities and are non-sequential (BR-13); malformed codes return the same 404 as unknown codes |
| Dependencies | `pnpm audit --prod` in CI (warning level) |

## 9. Configuration

Environment variables, parsed and validated at startup (`config.ts` with Zod); the process exits with a clear message if one is missing.

| Variable | App | Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | api, database | `postgresql://…-pooler…/cupcake?sslmode=require` | Runtime connection (Neon **pooled**) |
| `DIRECT_URL` | database | `postgresql://…/cupcake?sslmode=require` | Migrations (Neon **direct**) |
| `WEB_ORIGIN` | api | `https://cupcake-app.vercel.app` | CORS allow-list |
| `LOG_LEVEL` | api | `info` | Logger level |
| `ORDERS_RATE_LIMIT_MAX` | api (optional) | `10` | `POST /api/orders` requests per minute per IP (07 §1); tests lower it to trigger 429 |
| `STAFF_API_TOKEN` | api (optional, secret) | `openssl rand -hex 32` | Bearer token of the staff pickup endpoint (BR-21); at least 32 characters. Unset or empty: the endpoint answers `401` to everyone. Never committed or logged. |
| `API_URL` | web (server only) | local: `http://localhost:4000`; Vercel: injected by the `api` Services binding (D-23) | Target of the `/api/*` rewrite and of server-side fetches |
| `NEXT_PUBLIC_SITE_URL` | web | `https://cupcake-app.vercel.app` | Absolute URLs (metadata) |

The store info, opening hours and preparation time (`STORE`, D-24), the low-stock threshold and the line cap of 20 are code constants in `packages/shared`, not environment variables.

## 10. Environments and hosting

| Environment | Web | API | Database | Trigger |
|---|---|---|---|---|
| Local | `pnpm dev` (Next.js :3000) | `pnpm dev` (Fastify :4000) | Docker `postgres:16` (`cupcake_dev`) | Developer |
| Test / CI | n/a (Playwright starts both apps) | Fastify `inject` + started server | Docker/CI service `postgres:16` (`cupcake_test`) | Every push and PR |
| Preview | Vercel `cupcake-app` preview (`web` service) | Vercel `cupcake-app` preview (`api` service) | Neon branch `preview` (shared by previews) | Every PR |
| Production | Vercel `cupcake-app` (`web` service) | Vercel `cupcake-app` (`api` service) | Neon `main` branch | Merge to `main` |

**Why Vercel + Neon:** both apps deploy from Git with preview environments and instant rollback; Fastify runs on Vercel with zero configuration as a single function using Fluid compute (fewer cold starts, R-04); Neon is managed PostgreSQL 16 with branching and a free tier. Nothing to patch or keep running. One Vercel project (`cupcake-app`) with two Services (D-23, `vercel.json`): `web` (`apps/web`) and `api` (`apps/api`), one domain per environment. Top-level rewrites send `/api/*` to `api` and everything else to `web` — same-origin by construction, so the browser never needs CORS.

**Migrations:** never run on application start. `prisma migrate deploy` runs as a release step (`06-development-workflow.md` §5) against `DIRECT_URL`, before the production deployment is promoted.

**Health:** `GET /api/health` checks the API and a `SELECT 1`; used before user-testing sessions and recordings (R-04).

## 11. Quality attributes → tactics

| NFR | Tactic |
|---|---|
| NFR-01 Responsiveness | Mobile-first Tailwind, `overflow-x-clip`, visual checks at 390/1280 (Definition of Done, 06 §3) |
| NFR-02 Performance | Server-rendered catalog, `next/image`, 6 small photos, no client data library, API functions in Vercel `gru1` (São Paulo), next to Neon `sa-east-1` |
| NFR-03 Accessibility | shadcn/Base UI accessible primitives, labels, `aria-*` from UI doc §8.5, axe checks in E2E |
| NFR-04 Localization | `Intl` pt-BR formatters in `apps/web/src/lib/format.ts`, times in America/Sao_Paulo |
| NFR-05 Security | §8 |
| NFR-07 Errors | §7 + UI error map |
| NFR-08 Integrity | Transaction §6.1 + DB constraints (03-data-model §6) |
| NFR-09 Maintainability | Layering §3, dependency rule §5, lint/format, strict TS |
| NFR-10 Testability | `buildApp()` for injection tests, real PostgreSQL in CI (`05-testing-strategy.md`) |
| NFR-12 Payment clarity | Copy from UI doc; test that no payment UI exists (T-14-1) |

## 12. Risks and open points

| ID | Item | Mitigation |
|---|---|---|
| AR-1 | In-memory rate limiting is per instance on serverless | Acceptable for the MVP; add a Vercel Firewall rate-limit rule if abuse appears |
| AR-2 | Neon free tier suspends idle compute (cold connection ~1 s) | Warm up with `/api/health` before tests and recordings (R-04) |
| AR-3 | Prisma 7 driver-adapter setup on Vercel | Resolved: proven by the walking skeleton before feature work |
| AR-4 | Back end not on the course's suggested language list (R-01) | Plain, layered TypeScript; this document explains the MVC mapping |

## 13. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 11 Oct 2026 | Initial architecture: MVC mapping, monorepo, stack versions, order transaction, error model, security, configuration, environments, Vercel + Neon hosting |
| 1.1 | 11 Oct 2026 | D-23: one Vercel project (`cupcake-app`) with `web`/`api` Services instead of two projects; `API_URL` via Services binding |
| 1.2 | 11 Oct 2026 | E4: controllers validate with Zod (no `fastify-type-provider-zod`); layout matches the code (`build-app.ts`, one catalog routes file) |
| 1.3 | 11 Oct 2026 | E6: `ORDERS_RATE_LIMIT_MAX` documented; repositories take a Prisma transaction client so one service call runs them in one transaction |
| 1.4 | 11 Oct 2026 | §6.5: photos served unoptimized (the `/_next/image` route 404s in production); release smoke test covers a photo |
| 1.5 | 18 Oct 2026 | User validation (E9-03): §6.1 pickup schedule computed from the store's opening hours (step 5); new §6.1b lazy order expiry, exactly-once stock release and staff pickup (BR-20, BR-21); §6.3 the store stays in one config module (D-24; database tables were built and dropped); error codes `INVALID_ORDER_STATUS` and `UNAUTHORIZED`; `STAFF_API_TOKEN`; security row for the staff endpoint; repository layout |
| 1.6 | 18 Oct 2026 | Documentation review: router and controller roles match the code (validation in controllers); region `gru1`; AR-3 resolved; spec-driven wording |
