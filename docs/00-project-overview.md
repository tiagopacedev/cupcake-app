# 00 · Project Overview

| | |
|---|---|
| **Project** | Cupcake Store: mobile-first web store for cupcakes with store pickup |
| **Course** | Engenharia de Software · Projeto Integrador Transdisciplinar II (PIT II) |
| **Student** | Tiago Pace Greggio · RGM 34852191 |
| **Final due date** | Tue 17 Nov 2026 |
| **Version** | 1.8 (22 Oct 2026) |

## 1. Purpose

This repository holds the specification, design, code, tests and delivery evidence of a small cupcake store. It continues the PIT I planning work, which addressed the UX/UI of a cupcake store app.

The project follows **spec-driven development**: requirements, business rules, data model, API contract and UI are written and approved first, and the code implements them. Every requirement has an ID (BR-xx, US-xx, NFR-xx), and code, tests and evidence trace back to those IDs.

## 2. Context

- **PIT I scenario:** a gourmet cupcake shop withdrew its previous app after customer complaints caused by poorly elicited requirements. The new solution must be simple, reliable and validated with users.
- **PIT I submission:** only the intervention report was submitted. The planning artifacts PIT I describes (user stories, backlog, UML, wireframes, maps) are produced here as the planning baseline, as PIT II Situação 1 allows.
- **PIT II stages:** Situação 1 updates the planning and data design; Situação 2 builds, tests and deploys; Situação 3 validates with 5 testers, fixes and reports.

## 3. Product summary

A customer browses cupcakes (filters: All, Bestsellers, Classics, Chocolate, Fruity), picks quantities limited by stock, reviews the cart, enters name and phone (no account) and places the order. **Meu pedido** shows the order code, when the order will be ready and until when it can be collected. The customer **pays at the store** on pickup. The home page shows a card for each of the customer's orders still awaiting pickup.

Ready times follow the store's opening hours. Orders not collected by closing time expire and give their units back to stock. Staff record handovers through a protected API.

Scope, business rules and user stories: [01-prd.md](01-prd.md). Approved UI: [04-ui-design-system.md](04-ui-design-system.md), with screenshots and reference screens in [`design/`](design/).

**Status (18 Oct 2026):** v1.0.0 is live. Five testers validated it on 15–18 Oct; the fixes for their findings (v1.1.0) are implemented and tested, pending release. Task status: [08-execution-plan.md](08-execution-plan.md) §16.

## 4. Technology stack

| Layer | Choice |
|---|---|
| Front end (View) | Next.js + TypeScript, Tailwind CSS v4, shadcn/ui (theme in one `globals.css`) |
| Back end (Controller + Model) | Node.js 24 LTS + TypeScript + Fastify 5; MVC layering (routes → controllers → services → repositories); Zod validation |
| Database | PostgreSQL 16 (Neon in the cloud, Docker locally), Prisma ORM 7 |
| Tests | Vitest (unit, integration), Testing Library (components), Playwright (end-to-end) |
| Diagrams | PlantUML (UML) and Mermaid (flows, maps, ER), committed as source plus SVG/PNG |
| Repository | Public GitHub monorepo: `apps/web`, `apps/api`, `packages/shared`, `packages/database` |
| Hosting | One Vercel project (web and API as two services, Git deploys with previews) + Neon PostgreSQL |

Details and rationale: [02-architecture.md](02-architecture.md). API contract: [07-api-spec.md](07-api-spec.md) and [openapi.yaml](openapi.yaml).

## 5. Documentation map

| Path | Content |
|---|---|
| `README.md` | What the project is, how to run it, live links |
| `docs/00-project-overview.md` | This file: context, decisions, assumptions, risks, schedule, glossary |
| `docs/01-prd.md` | Scope, business rules, NFRs, user stories, backlog, use cases |
| `docs/02-architecture.md` | MVC mapping, stack, key design decisions, error model, security, configuration, environments |
| `docs/03-data-model.md` | Conceptual, logical and physical models, normalization, data dictionary, seed |
| `docs/04-ui-design-system.md` | Theme, components, screen specs, pt-BR copy, error messages |
| `docs/design/` | Approved UI reference: screenshots, standalone screen HTML, theme, product photos |
| `docs/05-testing-strategy.md` | Test levels, cases per rule, coverage gates, traceability |
| `docs/06-development-workflow.md` | Local setup, conventions, Definition of Done, branching, CI, migrations, deployment, release checklist |
| `docs/07-api-spec.md` + `docs/openapi.yaml` | Endpoint contract (OpenAPI 3.1) |
| `docs/08-execution-plan.md` | Phases, tasks, gates and progress tracker |
| `docs/diagrams/` | UML, ER, flows and planning diagrams (see its README) |
| `docs/situacao-2/` | Situação 2 evidence in Portuguese: Lighthouse reports, video script |
| `docs/situacao-3/` | Situação 3 evidence in Portuguese: tester kit, test report, video script |

**Read order:** `00` → `01` → `02` → `03` → `07` → `04` → `05` → `06` → `08`.

**Single-source rule:** each fact lives in one file; other files reference it by ID (BR-05, US-11, NFR-03…). The `situacao-*` folders summarize and link; they don't copy.

## 6. Language policy

| Content | Language |
|---|---|
| Code, identifiers, comments, commit messages, tests | English |
| Documentation outside `docs/situacao-*` | English |
| `docs/situacao-*` | Brazilian Portuguese |
| UI text, error messages shown to users, seed descriptions | Brazilian Portuguese |
| Product names | As defined in the seed (e.g. "Birthday Vanilla") |

## 7. Decision log

Superseded decisions stay in the log, struck through, so the reasoning remains traceable.

| ID | Date | Decision | Rationale / consequence |
|---|---|---|---|
| D-01 | 10 Oct | PIT I artifacts are created in this project as the planning baseline | Only the PIT I report exists; PIT II asks to create or revise them |
| D-02 | 10 Oct | Mobile-first responsive **web** app | PIT II accepts a web or mobile application |
| D-03 | 10 Oct | Standalone products; one category each; tags (Bestseller); stock quantities | Simple catalog; tags give the data model a M:N relationship |
| D-04 | 10 Oct | **Store pickup only**; no delivery, address or fees | Smaller scope; no address table |
| D-05 | 10 Oct | ~~Simulated Pix payment~~ | Superseded by D-15 |
| D-06 | 10 Oct | Data model: `Customer`, `Order`, `OrderItem` plus catalog entities; customer reused by phone; nothing exposed by phone | Guest checkout without accounts; privacy |
| D-07 | 10 Oct | No accounts, no admin panel, no real payments, no email lookup; order code presented at pickup | Scope control |
| D-08 | 10 Oct | Only `situacao-*` docs in Portuguese; everything else in English; UI text in Portuguese | Graders read Portuguese evidence; users are Brazilian |
| D-09 | 10 Oct | No Figma: the UI is specified as HTML mockups and screenshots, exported to `docs/design/` | Mockups versioned with the code |
| D-10 | 10 Oct | **Back end: Node.js + TypeScript + Fastify** | Owner's choice; not on the course's suggested list (see R-01) |
| D-11 | 10 Oct | ~~Stock decremented at payment confirmation; pending orders expire after 30 min~~ | Superseded by D-16 |
| D-12 | 10 Oct | Public order page by code (first name only, no phone) for customer reopening and staff verification | The only way staff can check an order without an admin panel |
| D-13 | 10 Oct | Diagrams as code (PlantUML, Mermaid) with SVG/PNG exports | Versioned and reviewable |
| D-14 | 10 Oct | Final due date 17 Nov 2026; one final submission for all three Situações | Drives the schedule |
| D-15 | 10 Oct | **Payment at the store**, at pickup; no online payment or payment screen | Owner's brief (BR-09) |
| D-16 | 11 Oct | Stock decremented atomically **when the order is created**; order starts as AWAITING_PICKUP; ~~ready in ~15 min; no expiry~~ | Follows from D-15 (BR-10, BR-11); ready time and expiry superseded by D-24 and D-25 |
| D-17 | 11 Oct | ~~Only the latest order remembered in the browser, shown on the home page on the day it was placed~~ | Superseded by D-27 |
| D-18 | 11 Oct | Approved visual system: Plus Jakarta Sans, 8 px radius, flat buttons, typography-only logo, six real product photos; seed reduced to the six photographed products | See 04-ui-design-system.md |
| D-19 | 11 Oct | Design system expressed as the standard Tailwind CSS v4 + shadcn/ui theme in one `globals.css`; no custom tokens or component variants | Easier to build and maintain; small pixel deviations from the mockups accepted |
| D-20 | 11 Oct | **Hosting: Vercel + Neon.** PostgreSQL 16 on Neon; the browser calls the API through a same-origin `/api` rewrite | Git deploys, previews, rollback, free tiers, no servers (R-04) |
| D-21 | 11 Oct | **Contract first:** `openapi.yaml` is written by hand and drives the web types and contract tests; shared Zod schemas for validation; Prisma ORM 7 | Spec-driven development; Prisma 8 was still a release candidate |
| D-22 | 11 Oct | Execution plan approved (gate G0). LGPD purpose line added at checkout (closes A-08); proposed copy approved; desktop checkout subtitle removed | Owner approval |
| D-23 | 11 Oct | **One Vercel project** with `web` and `api` as Vercel Services; `/api/*` rewritten to `api`; `web` reaches `api` through a Services binding (`API_URL`). Amends D-20 | One domain, same-origin by construction |
| D-24 | 18 Oct | **Pickup time follows the opening hours.** The store (name, address, time zone, preparation minutes, weekly hours) is one typed config module, `packages/shared/src/store.ts` (A-03). The API computes `readyAt` and `expiresAt` from it and stores them on the order. Orders placed while closed are accepted and ready at the next opening. Database tables for the hours were built and then dropped: with no admin panel they offered no easier editing and cost an extra endpoint, per-request rendering and a seed dependency. Revisit when an admin screen exists | Tester findings 2 and 6 (BR-12) |
| D-25 | 18 Oct | **Orders expire at closing time** of their pickup day (status `EXPIRED`) and release their stock exactly once, checked on API requests (no scheduled job). Closes A-09 | Tester finding 4 (BR-20) |
| D-26 | 18 Oct | **Staff API** `PATCH /api/orders/{code}/pickup` marks an order as picked up; secret bearer token (`STAFF_API_TOKEN`); no admin UI. Amends D-07 | Handed-over orders must not expire (BR-21) |
| D-27 | 18 Oct | **Several active orders in the browser:** up to 5 codes in `localStorage`; one home card per order still awaiting pickup, regardless of the day it was placed. Still no history list or lookup field | Tester findings 1 and 6 (BR-19) |
| D-28 | 18 Oct | The cap of 20 units shows "fale com a loja"; online payment stays out of scope. ("Compartilhar" on Meu pedido was part of this decision and was removed by D-29) | Tester findings 3, 5 and 7 (BR-06, D-15) |
| D-29 | 22 Oct | **Clean order code block:** Meu pedido shows only the hint, the code and the meta line; "Copiar código" (US-16 AC3) and "Compartilhar" (US-23) are removed. Another device opens the order by its link | Owner decision |

## 8. Assumptions and open items

| ID | Item | Value / status |
|---|---|---|
| A-01 | Maximum units per product line (BR-06) | 20 |
| A-02 | Low-stock display threshold | ≤ 5 units |
| A-03 | Store name, address, opening hours and preparation time (fictional) | "Cupcake Store", "Rua das Flores, 123 · Centro · São Paulo, SP", Tuesday to Sunday 10:00–19:00, 15 minutes (`packages/shared/src/store.ts`) |
| A-04 | Seed catalog | Six photographed cupcakes (`03-data-model.md` §8) |
| A-05 | All three Situações are submitted together on 17 Nov | Confirm on the course platform |
| A-06 | Disclosure of AI assistance (institutional policy) | One neutral sentence in the README |
| A-07 | Category and tag `name` hold the pt-BR label; `slug` holds the English identifier | Per D-08 |
| A-08 | ✅ LGPD purpose notice at checkout (NFR-06) | Resolved by D-22 (`04-ui-design-system.md` §9.3 `privacy.notice`) |
| A-09 | ✅ Uncollected orders keeping stock reserved | Resolved by D-25 and D-26 |

## 9. Risks

| ID | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R-01 | The back-end language isn't on the course's suggested list (Java, PHP, C#, .NET or Python) | Medium / High | Ask the tutor to confirm; explain the MVC structure in `02-architecture.md`; keep business logic in plain TypeScript services |
| R-02 | Tight timeline (5.5 weeks) | High / High | Specifications first, small verifiable tasks, release cut in the PRD (§9) |
| R-03 | Testers unavailable for validation | Medium / High | Recruit 5 + 1 spare early (done: 5 testers, 15–18 Oct) |
| R-04 | Hosting cold starts or free-tier limits during testing and recording | Medium / Medium | Health check before sessions; warm-up request |
| R-05 | Diagrams, PRD and code drift apart | Medium / Medium | IDs everywhere; docs updated in the same change as the code (06 §3) |
| R-06 | Real personal data from testers | Low / Medium | Collect only name and phone; fictitious data allowed; consent before names appear in reports |
| R-07 | Implementation drifts from the approved UI | Medium / Medium | Visual comparison with `docs/design/` at 390 and 1280 px is part of the Definition of Done (06 §3) |

## 10. Schedule

| Phase | Dates (2026) | Content | Status |
|---|---|---|---|
| P1 · Planning baseline | 10–13 Oct | Overview, PRD (stories, rules, NFRs, affinity map, backlog, tasks) | ✅ Done |
| P2 · Modeling | 10–18 Oct | Use cases, class and package diagrams, sequence and activity diagrams, database models, data dictionary | ✅ Done |
| P3 · UX design | 10–21 Oct | User flow, navigation map, design system, screen specs, pt-BR copy, mockups; peer critique | ✅ UI approved 11 Oct; peer critique pending |
| P4 · Architecture and skeleton | 11–24 Oct | Architecture, API spec, testing strategy, workflow; monorepo, CI, walking skeleton deployed | ✅ Done |
| P5 · Implementation | 11 Oct – 3 Nov | Back end and front end per the backlog, with tests | ✅ v1.0.0 released 17 Oct |
| P6 · Verification | by 6 Nov | Test report, user manual, narrated video (≥ 5 min) | In progress |
| P7 · Validation | 15 Oct – 14 Nov | Testing with 5 users (done 15–18 Oct), fixes, quality report, updated video (≤ 5 min) | Fixes implemented; release v1.1.0 pending |
| P8 · Submission | 15–16 Nov | Fill in the official template, check every link, tag the release, submit | Pending |

## 11. Glossary

| Term | Meaning |
|---|---|
| **PIT** | Projeto Integrador Transdisciplinar, the course's integrative project |
| **Situação (1/2/3)** | One of PIT II's three challenge stages |
| **RGM** | Student registration number |
| **Meu pedido** | The order page shown right after ordering and when reopened (`/orders/{code}`) |
| **Active-order cards** | Home-page cards for the orders placed in this browser that still await pickup (up to 5) |
| **Order code** | Public, non-sequential order identifier (`CUP-XXXXXX`), shown at pickup |
| **Pickup** | Collecting the order at the store counter |
| **Awaiting pickup** | Status of a placed order until it is collected (PICKED_UP) or expires (EXPIRED) |
| **Ready time** | First moment the order can be collected, within opening hours (BR-12) |
| **Pickup deadline** | Closing time of the pickup day; an order not collected by then expires (BR-20) |
| **DDD** | Brazilian 2-digit telephone area code |
| **E.164** | International phone number format, e.g. `+5511912345678` |
| **BRL cents** | Money stored as integers in centavos (R$ 12,50 = 1250) |
| **MVC** | Model–View–Controller architectural pattern required by the course |
| **V&V** | Verification (built right, against the specs) and Validation (right product, with users) |
| **LGPD** | Lei Geral de Proteção de Dados, Brazil's data protection law |
