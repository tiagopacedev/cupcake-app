# 07 · API Specification

| | |
|---|---|
| **Version** | 1.2 (11 Oct 2026) |
| **Status** | Draft for approval |
| **Contract** | [`openapi.yaml`](openapi.yaml) (OpenAPI 3.1, validated with Redocly CLI) |
| **Related** | [02-architecture.md](02-architecture.md) (error model, security) · [01-prd.md](01-prd.md) (BR, US) · [04-ui-design-system.md](04-ui-design-system.md) §9.5 (error → pt-BR) |

`openapi.yaml` is the **source of truth for shapes**; this document explains behavior, rules and examples. If they disagree, fix both in the same change (contract test, `05-testing-strategy.md` §3.4).

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Base path | `/api` on the API; the browser uses the same path on the web origin (Next.js rewrite) |
| Format | JSON, UTF-8, camelCase fields; unknown request properties are rejected (`400`) |
| Money | Integer BRL cents (`1190` = R$ 11,90) |
| Time | ISO 8601 UTC (`2026-10-11T17:35:00.000Z`); displayed in America/Sao_Paulo by the UI |
| Identifiers | Products by UUID (`id`) and `slug`; orders **only** by public `code` (`CUP-XXXXXX`) |
| Auth | None (public API, no accounts or admin) |
| Errors | `ErrorResponse` with a stable `code` ([02-architecture §7](02-architecture.md#7-error-model-nfr-07)) |
| Tracing | `x-request-id` response header on every response; same value in `error.requestId` |
| Caching | `Cache-Control: no-store` on all endpoints (stock and orders change) |
| Rate limits | `POST /api/orders` 10/min per IP; others 120/min; `429 RATE_LIMITED` with `Retry-After` |

## 2. Endpoint summary

| Method | Path | Purpose | Stories / rules | Screens |
|---|---|---|---|---|
| GET | `/api/health` | Liveness + DB check | R-04 | n/a |
| GET | `/api/catalog/filters` | Categories and tags for the chips | US-02, US-03 · BR-02, BR-03 | SCR-01 |
| GET | `/api/products` | Active products (optional `category` or `tag`) | US-01–04, US-10 · BR-03, BR-04, BR-06 | SCR-01, SCR-02, SCR-03 |
| POST | `/api/orders` | Place order, reserve stock | US-11, US-12, US-15, US-19 · BR-07, BR-10–BR-15 | SCR-03 |
| GET | `/api/orders/{code}` | Public order view | US-16–18, US-20, US-22 · BR-12, BR-13, BR-16 | SCR-04, home card |

Five endpoints, nothing else. There is deliberately **no** payment endpoint (BR-09), no order list, no lookup by phone (BR-16) and no write endpoint for the catalog.

---

## 3. Endpoints

### 3.1 `GET /api/health`

`200 { "status": "ok", "database": "ok" }` after a `SELECT 1`. `500 INTERNAL_ERROR` if the database is unreachable.

### 3.2 `GET /api/catalog/filters`

Returns categories ordered by `sortOrder` and all tags, with pt-BR display names.

```json
{
  "categories": [
    { "slug": "classics", "name": "Clássicos" },
    { "slug": "chocolate", "name": "Chocolate" },
    { "slug": "fruity", "name": "Frutados" }
  ],
  "tags": [{ "slug": "bestseller", "name": "Mais vendido" }]
}
```

UI chip mapping (`?filter=` on the web): `bestsellers` → `tag=bestseller`; `classics` / `chocolate` / `fruity` → `category=<slug>`; none → no parameter.

### 3.3 `GET /api/products`

| Query | Rule |
|---|---|
| none | All active products |
| `category=<slug>` | Active products of that category (BR-03) |
| `tag=<slug>` | Active products with that tag, any category (BR-03) |
| both | `400 VALIDATION_ERROR` (mutually exclusive) |
| unknown slug | `200` with an empty list (the UI shows the empty state) |

Response `200` is `{ "products": [ … ] }` (`ProductList` in `openapi.yaml`, never a bare array; `{ "products": [] }` for an empty result). Each product:

```json
{
  "id": "3f6c1d2a-6a4e-4b8e-9a1f-2c3d4e5f6a7b",
  "slug": "cookies-and-cream",
  "name": "Cookies & Cream",
  "description": "Biscoito · creme",
  "priceCents": 1290,
  "imageUrl": "/images/products/cookies-and-cream.jpg",
  "category": { "slug": "chocolate", "name": "Chocolate" },
  "tags": [],
  "stockQuantity": 3,
  "stockState": "LOW",
  "maxQuantity": 3
}
```

- `stockState`: `SOLD_OUT` (0), `LOW` (1–5), `AVAILABLE` (> 5) (BR-04, A-02).
- `maxQuantity = min(stockQuantity, 20)`: the stepper limit (BR-06). The server re-validates on order creation.
- Order: category `sortOrder`, then seed order (matches the approved catalog: Birthday Vanilla, Red Velvet Classic, Chocolate Crush, Cookies & Cream, Strawberry Kiss, Lemon Cream). Implementation: `ORDER BY categories.sort_order, products.created_at, products.name` with the seed inserting in display order.
- The cart refresh (US-10) calls this endpoint without parameters and reconciles by `id`: missing id → line removed (inactive); `maxQuantity` < cart quantity → quantity reduced; price changes are shown (US-08 AC4).

### 3.4 `POST /api/orders`

**Request**

```json
{
  "customer": { "name": "Ana Souza", "phone": "(11) 91234-5678" },
  "items": [
    { "productId": "3f6c1d2a-6a4e-4b8e-9a1f-2c3d4e5f6a7b", "quantity": 2 },
    { "productId": "9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", "quantity": 1 }
  ]
}
```

**Validation** (Zod schema `createOrderSchema` in `packages/shared`, used by the checkout form and the route):

| Field | Rule | Field error message (dev) |
|---|---|---|
| `customer.name` | trimmed length 2–80 | `Name must have 2 to 80 characters` |
| `customer.phone` | after removing spaces, `()`, `-` and an optional `+55`/`55` prefix: `^[1-9]{2}9\d{8}$`; normalized to `+55DD9XXXXXXXX` | `Invalid Brazilian mobile number` |
| `items` | 1–50 lines, unique `productId` | `Items must not be empty` / `Duplicate product` |
| `items[].quantity` | integer 1–20 | `Quantity must be between 1 and 20` |

**Processing** ([02-architecture §6.1](02-architecture.md#61-order-creation-br-10-br-11-br-15-br-19), [SD-02](diagrams/sequence-diagrams/sd-02-place-order.svg)): one transaction → products active? → conditional stock decrement per line (product-id order) → customer upsert by phone → totals from DB prices → insert order `AWAITING_PICKUP` + items → retry on code collision (max 5).

**Responses**

| Status | Body | When |
|---|---|---|
| `201` | `Order` + `Location: /api/orders/{code}` | Created; stock reserved |
| `400` | `VALIDATION_ERROR` with `details.fields[]` | Schema failure, unknown fields (e.g. a client price, BR-07) and malformed JSON (`path: "(body)"`) |
| `409` | `PRODUCT_NOT_FOUND` with `details.productIds[]` | Missing or inactive product; nothing changed |
| `409` | `INSUFFICIENT_STOCK` with `details.items[] {productId, requested, available}` | Any line exceeds stock; nothing changed. Lists **every** short line. |
| `429` | `RATE_LIMITED` | > 10 orders/min from one IP |

The client then clears the cart, stores `{ code, createdAt }` as the latest order (BR-19) and navigates to `/orders/{code}?new=1`. Double submission is prevented in the UI (button disabled); the API has no idempotency key in the MVP.

### 3.5 `GET /api/orders/{code}`

```json
{
  "code": "CUP-7K3Q9F",
  "pickupStatus": "AWAITING_PICKUP",
  "customerFirstName": "Ana",
  "createdAt": "2026-10-11T17:35:00.000Z",
  "readyAt": "2026-10-11T17:50:00.000Z",
  "items": [
    { "productId": "3f6c…", "slug": "chocolate-crush", "name": "Chocolate Crush", "imageUrl": "/images/products/chocolate-crush.jpg", "quantity": 2, "unitPriceCents": 1190, "lineTotalCents": 2380 },
    { "productId": "9b8a…", "slug": "birthday-vanilla", "name": "Birthday Vanilla", "imageUrl": "/images/products/birthday-vanilla.jpg", "quantity": 1, "unitPriceCents": 990, "lineTotalCents": 990 }
  ],
  "totalCents": 3370
}
```

- `items` are sorted by product name, the same in the `POST` and `GET` responses (the cart order isn't stored).
- `customerFirstName` = first word of the stored name; the phone and internal ids are never returned (BR-16).
- `readyAt = createdAt + 15 min` (BR-12). `items` keep the **unit price paid** (BR-07); `name`/`imageUrl` are the product's current values.
- The code is upper-cased before lookup (`cup-7k3q9f` works). Malformed or unknown → `404 ORDER_NOT_FOUND`.
- Used by Meu pedido (SSR), the home latest-order card (BR-19) and staff at the counter.

---

## 4. Error codes → UI

| Code | HTTP | Endpoint(s) | UI handling (pt-BR copy in UI doc §9.5) |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | products, orders | Field messages next to Nome / Celular (map by `details.fields[].path`) |
| `PRODUCT_NOT_FOUND` | 409 | POST orders | Notice + "Revisar" → cart; line removed on refresh |
| `INSUFFICIENT_STOCK` | 409 | POST orders | Notice "{nome}: só {n} disponível." + "Revisar"; summary line in red; cart adjusted |
| `ORDER_NOT_FOUND` | 404 | GET order | "Pedido não encontrado"; home card removes the stored code |
| `NOT_FOUND` | 404 | any unknown route | n/a (developer error) |
| `RATE_LIMITED` | 429 | all | "Muitas tentativas. Tente de novo em instantes." |
| `INTERNAL_ERROR` | 500 | all | "Não foi possível carregar · Verifique sua conexão." + "Tentar de novo" |

## 5. Client generation

The web app generates types from the contract and uses `openapi-fetch`:

```bash
pnpm --filter web exec openapi-typescript ../../docs/openapi.yaml -o src/lib/api/schema.d.ts
```

```ts
// apps/web/src/lib/api/client.ts
import createClient from "openapi-fetch";
import type { paths } from "./schema";
export const api = createClient<paths>({ baseUrl: typeof window === "undefined" ? process.env.API_URL : "" });
```

Regenerate whenever `openapi.yaml` changes (CI fails if the committed file is stale).

## 6. Traceability

| Endpoint | Use cases | Sequence diagrams |
|---|---|---|
| `GET /api/catalog/filters`, `GET /api/products` | UC-01, UC-02 (cart refresh) | SD-01 |
| `POST /api/orders` | UC-03 (+UC-07) | SD-02 |
| `GET /api/orders/{code}` | UC-04, UC-05, UC-06 | SD-03, SD-04 |

## 7. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 11 Oct 2026 | Initial contract: health, filters, products, create order, get order; error codes; rate limits |
| 1.1 | 11 Oct 2026 | E4: §3.3 states the `{ "products": [...] }` envelope that `openapi.yaml` already defined |
| 1.2 | 11 Oct 2026 | E6: order items sorted by name; unknown fields and malformed JSON are `400` |
