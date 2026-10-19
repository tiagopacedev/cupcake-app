# 05 · Testing Strategy

| | |
|---|---|
| **Version** | 1.4 (18 Oct 2026) |
| **Related** | [01-prd.md](01-prd.md) (AC, BR, NFR) · [02-architecture.md](02-architecture.md) · [07-api-spec.md](07-api-spec.md) · [04-ui-design-system.md](04-ui-design-system.md) · [06-development-workflow.md](06-development-workflow.md) (CI) |

This document defines how the product is **verified** (built right, against the spec) during development, and how the evidence feeds the Situação 2 test report and the Situação 3 **validation** with 5 testers.

---

## 1. Principles

1. **Every business rule has unit tests; every endpoint has integration tests, including error paths** (NFR-10).
2. **Real PostgreSQL** for integration tests. The database is never mocked; transactions, constraints and concurrency are part of what we test.
3. **Traceability:** test names start with the ID they verify: `describe("BR-11 stock reservation")`, `it("US-15 AC4 only one order wins the last unit")`.
4. **Every acceptance criterion maps to an automated test or a documented manual check** (§5).
5. **Fast feedback:** unit tests run in < 10 s; the full suite (excluding E2E) in < 2 min in CI.

## 2. Test levels and tools

| Level | Scope | Tool | Location | Runs |
|---|---|---|---|---|
| **Unit** | Services with fake repositories, pure functions: phone normalization, order code, stock state, totals, pickup schedule (`computePickup`), order expiry, formatters, ready/deadline labels, cart and active-orders stores | Vitest | `**/*.test.ts` next to the code | Every commit, CI |
| **Integration (API)** | Routes → controllers → services → Prisma → PostgreSQL via `app.inject()` | Vitest + `buildApp()` + Docker `postgres:16` | `apps/api/test/**/*.int.test.ts` | CI (Postgres service) |
| **Database** | Constraints and DDL equivalence (Prisma migrations vs `physical-model.sql`) | Vitest + `pg` | `packages/database/test/` | CI |
| **Contract** | API responses validate against `docs/openapi.yaml`; generated web types are up to date; error-code list matches | Vitest + Ajv (OpenAPI 3.1 schemas) · Redocly lint | `apps/api/test/helpers/contract.ts`, `apps/api/test/contract.test.ts`, `packages/shared/src/error-codes.test.ts` | CI |
| **Component** | UI components and their states (stepper limits, card states, field errors, active-order cards show/hide, ready label and pickup rows) | Vitest + Testing Library + jsdom | `apps/web/src/**/*.test.tsx` | CI |
| **End-to-end** | The full journey on a real build: catalog → cart → checkout → Meu pedido → home cards; stock error flow; expiry | Playwright (Chromium, mobile 390×844 and desktop 1280×800) | `e2e/tests/` | CI on `main` and before releases |
| **Visual** | A screenshot per screen, compared by hand with the approved screenshots | Playwright | `e2e/tests/quality.spec.ts` | Before releases |
| **Accessibility** | axe rules (WCAG 2.1 AA) on every screen; keyboard pass | `@axe-core/playwright` + manual | `e2e/tests/quality.spec.ts` | Before releases |
| **Performance** | Catalog LCP ≤ 2.5 s on mobile (NFR-02) | Lighthouse (mobile) on production | `docs/situacao-2/lighthouse/` | Before releases |
| **Manual / exploratory** | Real phone (Android + iOS), staff verification at the counter, copy review | Checklist §6 | `docs/situacao-2/` | P6 |
| **Validation (users)** | 5 testers complete a six-task script and a questionnaire | Tester kit and test report | `docs/situacao-3/` | P7 (done 15–18 Oct) |

## 3. What to test, per layer

### 3.1 Unit (examples, not exhaustive)

| Rule | Cases |
|---|---|
| BR-14 phone | `(11) 91234-5678`, `11912345678`, `+55 11 91234-5678` → `+5511912345678`; landline `1131234567`, 8 digits, DDD `01`, letters → invalid |
| BR-14 name | `"  A "` invalid; 2 and 80 chars valid; 81 invalid |
| BR-13 code | format `^CUP-[…]{6}$`, alphabet excludes 0/O/1/I/L, 10 000 codes have no duplicates in practice |
| BR-04 stock state | 0 → SOLD_OUT, 1 and 5 → LOW, 6 → AVAILABLE; `maxQuantity = min(stock, 20)` |
| BR-07/08 totals | Σ quantity × unit price from DB prices; client prices ignored |
| BR-12 pickup schedule | `computePickup` with an injected clock: mid-day (+15 min), before opening, exactly at opening, 22:00 → next day 10:15, Monday closed → Tuesday, Sunday evening → Tuesday, 18:30 (last order that leaves 15 minutes before closing) and 18:31 (rolls over), local date vs UTC around midnight, another time zone and a UTC-offset change (DST), no usable hours → error |
| BR-12 labels | ready label (`~N min` / today / tomorrow / date), meta line and pickup deadline in America/Sao_Paulo; `formatOpeningHours` ("Ter a dom, 10h às 19h") |
| BR-20 expiry | `OrderExpiryService` with a fake clock and fake repositories: nothing overdue → no transaction; units given back per product in product-id order; nothing released when a concurrent request already expired the orders |
| BR-17 cart store | add/merge, cap at `maxQuantity`, remove at 0 from card stepper, persistence, clear |
| BR-19 active orders | newest first, cap of 5, no duplicate codes, removal, corrupt JSON or invalid entries ignored, storage unavailable doesn't throw, migration of `cupcake.lastOrder` |
| BR-16 first name | `"Ana Souza"` → `Ana`; extra spaces |

### 3.2 Integration (API, real PostgreSQL)

Database lifecycle: one database `cupcake_test`; `prisma migrate deploy` once per run; before each test file `TRUNCATE … RESTART IDENTITY CASCADE` and load the seed fixture (the six products). The clock is injected through `buildApp(config, { now })`, so results never depend on the time of day the suite runs. Test files run one at a time (`fileParallelism: false`) because they share the database.

| Endpoint | Must cover |
|---|---|
| `GET /api/catalog/filters` | order by sortOrder; pt-BR names |
| `GET /api/products` | all active; `category`; `tag`; both → 400; unknown slug → []; inactive hidden; stockState/maxQuantity; seed order |
| `POST /api/orders` | 201 happy path (stock decremented, order AWAITING_PICKUP, unit prices snapshotted, total, Location header, no phone in body); customer reuse updates name (BR-15); each validation rule → 400 with `fields`; duplicate productId → 400; inactive/missing product → 409 `PRODUCT_NOT_FOUND`, nothing written; insufficient stock → 409 lists **all** short lines, nothing written; **concurrency**: 2 parallel orders for the last unit → exactly one 201 and one 409, final stock 0; code collision → retried (inject a fixed code generator) |
| `GET /api/orders/{code}` | 200 shape (first name only, stored `readyAt` and `expiresAt`); lowercase code works; unknown and malformed → 404; an order past its closing time is returned as `EXPIRED` |
| Pickup schedule (`POST /api/orders`) | open: ready +15 min and expires at closing, both stored; 22:00 → next day 10:15; Monday → Tuesday; Sunday evening → Tuesday |
| Expiry (BR-20, US-25) | closing time passed → listing the catalog expires the order and restores the stock; not yet overdue → stays reserved; stays viewable as `EXPIRED`; several simultaneous requests release the stock **once**; an order placed after closing expires at closing of its pickup day; creating an order first frees overdue units; multi-line, multi-order release |
| `PATCH /api/orders/{code}/pickup` (BR-21, US-24) | 200 and `PICKED_UP`; 401 without header, with a wrong token, with another scheme, and on a server without a token (nothing changes, token never echoed); 409 when already picked up or expired; 404 unknown/malformed; a picked-up order never releases its stock; two simultaneous calls → one 200 and one 409 |
| Cross-cutting | `x-request-id` present; unknown route 404 `NOT_FOUND`; rate limit returns 429 after 10 orders/min (test with a low limit config); 500 handler hides stack; logs don't contain the phone (capture logger output) |

### 3.3 Database

The 14 constraint checks from `03-data-model.md` §9 (plus cases 15 and 16 for the order schedule) become tests; plus a schema-diff test that the migrated database matches `physical-model.sql` (compare `information_schema` + `pg_constraint` names).

### 3.4 Contract

- Every integration-test response is validated against the matching `openapi.yaml` response schema (helper `expectToMatchContract(res, "createOrder", 201)`).
- `pnpm --filter web gen:api` output must equal the committed `schema.d.ts` (CI diff).
- `ErrorCode` enum in `openapi.yaml` equals `packages/shared/src/error-codes.ts`.

### 3.5 Component (web)

ProductCard states (add, stepper, low, sold out, max reached), FilterChips selection and no heading, CartLine remove confirmation, Checkout field errors and loading button, OrderSummary error variant, ActiveOrderCards rules (mock API: several cards, previous-day order kept, pruning on 404/PICKED_UP/EXPIRED, network error keeps the code), Meu pedido `?new=1` notice only once (with the ready label outside opening hours), expired and picked-up notices, "Compartilhar" (share sheet, copy fallback, abort), the cap-of-20 message, and the ready label and pickup rows from the store config.

### 3.6 End-to-end journeys (Playwright)

| ID | Journey | Assertions |
|---|---|---|
| E2E-1 | Mobile: open `/` → filter Chocolate → add 2 × Chocolate Crush → cart → checkout → valid data → Fazer pedido | Meu pedido shows "Pedido feito!", code format, items, "Total a pagar na loja"; back home shows the order card; refresh Meu pedido hides the notice |
| E2E-2 | Stock conflict: set stock to 1 through the DB, order 2 | Notice "só 1 disponível", "Revisar" → cart quantity 1 |
| E2E-3 | Invalid data | Field messages; no order row created |
| E2E-4 | Desktop checkout | Summary aside visible with total; order succeeds |
| E2E-5 | Order not found | `/orders/CUP-ZZZZZZ` → "Pedido não encontrado" |

E2E runs against `next build && next start` + the API on a fresh seeded test database.

Implemented in `e2e/tests/`: `journeys.spec.ts` (E2E-1…E2E-5), `extras.spec.ts` (the other E-level criteria of §5: filter in the URL, stock limit and cart persistence, empty cart, removal confirmation, reopening by code, the active-order cards (several orders, previous day, legacy key), expiry and stock release, the share button, the cap-of-20 message, no payment wording, store data in the server-rendered HTML) and `quality.spec.ts` (§4 quality gates, below), each in a mobile (390×844) and a desktop (1280×800) project.

**Quality checks in `quality.spec.ts`** (eight screens, both projects): no horizontal overflow at 360, 390, 768, 1280 and 1440 px (NFR-01); axe WCAG 2.1 A/AA with no serious or critical violation (NFR-03); a screenshot per screen for the visual comparison with `docs/design/screenshots/`. Pixel-diff snapshots are deliberately not used: fonts render differently on a developer's Windows machine and on the CI Linux runner, so a baseline would fail on one of them. Lighthouse mobile is run by hand against production (`docs/situacao-2/lighthouse/`).

## 4. Coverage and quality gates

| Gate | Threshold | Enforced |
|---|---|---|
| Unit + integration pass | 100 % | CI blocks merge |
| Line coverage, `apps/api/src/services` and `packages/shared` | ≥ 90 % | CI (Vitest `coverage.thresholds`) |
| Line coverage, whole repo | ≥ 75 % | CI |
| Lint, type-check, Prettier | 0 errors | CI |
| OpenAPI lint (Redocly) | 0 errors | CI |
| axe violations (serious/critical) | 0 | Release checklist |
| Lighthouse mobile (catalog) | Performance ≥ 85, Accessibility ≥ 95 | Release checklist |

## 5. Acceptance-criteria traceability

Legend: **U** unit · **I** API integration · **C** component · **E** E2E · **M** manual.

| Story | AC → level |
|---|---|
| US-01 | AC1 I+E · AC2 C · AC3 C+E(network mocked) · AC4 I |
| US-02 | AC1 I+C (no heading) · AC2 C · AC3 C · AC4 E · AC5 C+E |
| US-03 | AC1 I · AC2 C |
| US-04 | AC1 C+U · AC2 C+U · AC3 C+U |
| US-05 | AC1 C+E · AC2 C · AC3 C |
| US-06 | AC1 C+U · AC2 C · AC3 U · AC4 I · AC5 C+E |
| US-07 | AC1 U+C · AC2 C |
| US-08 | AC1 C · AC2 C · AC3 E · AC4 C |
| US-09 | AC1 C · AC2 C · AC3 C |
| US-10 | AC1 U+E · AC2 C · AC3 C |
| US-11 | AC1 E · AC2 I · AC3 C · AC4 C · AC5 C |
| US-12 | AC1 U+C · AC2 U+C · AC3 U+I · AC4 C |
| US-13 | AC1 C+E · AC2 C · AC3 C · AC4 U+C+I |
| US-14 | AC1 C · AC2 C · AC3 C (no payment UI test) + M |
| US-15 | AC1 I+E · AC2 C · AC3 C · AC4 I (concurrency) |
| US-16 | AC1 C+E · AC2 U+I · AC3 C |
| US-17 | AC1 C · AC2 C+E · AC3 C+E |
| US-18 | AC1 I+E · AC2 I+E · AC3 C+E · AC4 C+I+E |
| US-19 | AC1 I+E · AC2 C+E · AC3 I |
| US-20 | AC1 M (staff walkthrough) + I · AC2 I |
| US-21 | AC1 I (seed test) · AC2 I · AC3 I |
| US-22 | AC1 C+E · AC2 E · AC3 C · AC4 C+E · AC5 C+E · AC6 C+E · AC7 U |
| US-23 | AC1 C · AC2 C · AC3 C (button presence: E) |
| US-24 | AC1 I · AC2 I · AC3 I · AC4 I · AC5 I |
| US-25 | AC1 I+E · AC2 U+I · AC3 I · AC4 I+C+E |

NFR evidence: NFR-01 visual + manual phones · NFR-02 Lighthouse/autocannon · NFR-03 axe + keyboard · NFR-04 U (formatters) · NFR-05 I (rate limit, validation, headers) · NFR-06 I (no phone in responses/logs) · NFR-07 I + C · NFR-08 I + DB · NFR-09 lint/types · NFR-10 CI · NFR-11 manual browser matrix · NFR-12 C + M.

## 6. Manual test checklist (P6)

- Real phones: one Android (Chrome) and one iPhone (Safari) complete E2E-1; no horizontal scroll; chips swipe; keyboard doesn't cover the CTA.
- Desktop browsers: Chrome, Firefox, Safari, Edge (latest).
- Staff walkthrough: open a code typed by hand, read items and total aloud.
- Copy review against UI doc §9 (accents, `R$` format, middle dots).
- Screen comparison against `docs/design/screenshots/` at 390 and 1280 px.

## 7. Evidence for the deliverables

| Deliverable | Evidence |
|---|---|
| Situação 2 test report (V&V) | CI run links, coverage summary, AC traceability table (§5) with pass/fail, Lighthouse report, manual checklist |
| Situação 3 validation | Tester kit (tasks and questionnaire), the 5 responses (test report), findings → fixes → re-test, quality report |

## 8. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 11 Oct 2026 | Initial strategy: levels, tools, per-layer cases, gates, AC traceability, manual checklist |
| 1.1 | 11 Oct 2026 | E8: §3.6 documents the implemented E2E suite and the quality checks (overflow, axe, screenshots; Lighthouse by hand), and why pixel-diff snapshots are not used |
| 1.2 | 11 Oct 2026 | US-02 AC5 (sticky chips) and "every photo loads" added to the E level |
| 1.3 | 18 Oct 2026 | E9-03: injected clock for time-dependent API tests; cases for the pickup schedule (BR-12), expiry and exactly-once stock release (BR-20), staff pickup (BR-21), active orders (BR-19), share and the cap-of-20 message; e2e covers several cards, expiry and a closed-store order |
| 1.4 | 18 Oct 2026 | Documentation review: test locations match the repository (contract helper, `quality.spec.ts`); traceability for US-23…US-25 and the new acceptance criteria; validation done 15–18 Oct |
