# 00 · Project Overview

| | |
|---|---|
| **Project** | Cupcake App: mobile-first web store for cupcakes with store pickup |
| **Course** | Engenharia de Software · Projeto Integrador Transdisciplinar II (PIT II) |
| **Student** | Tiago Pace Greggio · RGM 34852191 |
| **Final due date** | **Tue 17 Nov 2026** |
| **Version** | 1.4 (11 Oct 2026, execution plan approved — gate G0) |

## 1. Purpose

This repository contains the specification, design, code, tests and delivery evidence for a small cupcake e-commerce application. It continues the PIT I planning work, which addressed UX/UI for a cupcake store app.

The project is also an example of **AI-driven specification and development**: requirements, models and conventions are written first, and Claude Code implements against them. Every requirement has an ID, and code, tests and evidence trace back to those IDs.

## 2. Context

- **PIT I scenario:** a gourmet cupcake shop withdrew its previous app after customer complaints caused by poorly elicited requirements. The new solution must be simple, reliable and validated with users.
- **PIT I submission:** only the intervention report (Situação-Problema 3) was submitted. The planning artifacts PIT I describes (user stories, backlog, UML, wireframes, maps) are **produced in this project as the planning baseline during PIT II Situação 1**, which asks to "verificar e adequar / fazer ou revisar" the planning.
- **PIT II:** Situação 1 = update planning and data design · Situação 2 = build, test and deploy · Situação 3 = validate with 5 testers, fix, report.

## 3. Product summary

A customer browses cupcakes (filters: All Cupcakes, Bestsellers, Classics, Chocolate, Fruity), picks quantities limited by stock, reviews the cart, enters name and phone (no account), reviews the full order summary and places the order. **Meu pedido** shows the order code; the order is ready in about 15 minutes, and the customer **pays at the store** when collecting it. While the order awaits pickup, the home page shows a small card that reopens it (this browser only).

Full scope, business rules and user stories: **[01-prd.md](01-prd.md)**. Approved UI: **[04-ui-design-system.md](04-ui-design-system.md)** with screenshots and reference screens in [`design/`](design/).

## 4. Technology stack

| Layer | Choice |
|---|---|
| Front end (View) | Next.js + TypeScript, Tailwind CSS v4, shadcn/ui on Base UI (standard variants; theme in one `globals.css`) |
| Back end (Controller + Model) | **Node.js 24 LTS + TypeScript + Fastify 5**, MVC layering (routes → controllers → services → repositories), Zod validation |
| Database | PostgreSQL 16 (Neon in the cloud, Docker locally) |
| ORM / migrations | Prisma ORM 7 (driver adapter `pg`) |
| Tests | Vitest (unit and integration), Testing Library (components), Playwright (one end-to-end journey) |
| Diagrams | PlantUML (UML) and Mermaid (flows, maps, ER), committed as source plus SVG/PNG exports |
| UI design | Claude Design (Phase 3, approved 11 Oct): Plus Jakarta Sans, flat Preply-inspired style, real product photos |
| Repository | Public GitHub monorepo: `apps/web`, `apps/api`, `packages/database` |
| Hosting | Vercel (web and API as two projects, Git deploys with previews) + Neon PostgreSQL via the Vercel Marketplace |

Details and rationale: [`02-architecture.md`](02-architecture.md); API contract: [`07-api-spec.md`](07-api-spec.md) + [`openapi.yaml`](openapi.yaml).

## 5. Repository and documentation map

| Path | Content | Language |
|---|---|---|
| `README.md` | Summary, live links, setup, index of deliverables per Situação | English |
| `CLAUDE.md` | Rules for AI-assisted work in this repository | English |
| `docs/00-project-overview.md` | This file: context, decisions, risks, schedule, glossary | English |
| `docs/01-prd.md` | Scope, business rules, NFRs, user stories, backlog, tasks | English |
| `docs/02-architecture.md` | MVC mapping, stack, API design principles, error model, security, environments | English |
| `docs/03-data-model.md` | Conceptual, logical (normalized) and physical models, data dictionary | English |
| `docs/04-ui-design-system.md` | Design tokens, components, screen specs, UI copy (pt-BR), error-message map | English (UI copy in pt-BR) |
| `docs/design/` | Approved UI reference: screenshots, standalone screen HTML, tokens, product photos, icons | n/a |
| `docs/05-testing-strategy.md` | Test levels, tools, coverage, acceptance checklist | English |
| `docs/06-development-workflow.md` | Branching, commits, CI, deployment, release checklist | English |
| `docs/07-api-spec.md` + `docs/openapi.yaml` | Endpoint contract (OpenAPI 3.1) | English |
| `docs/08-execution-plan.md` | Phases E0–E10, tasks, dependencies, acceptance criteria, gates, progress tracker | English |
| `docs/user-manual.md` | User manual with screenshots | English |
| `docs/diagrams/` | `planning/`, `use-cases/`, `class-diagram/`, `sequence-diagrams/`, `activity-diagrams/`, `database/`, `user-flows/` | English |
| `docs/situacao-1/` | Índice da Situação 1, revisão por pares, alterações em relação ao PIT I | **Português** |
| `docs/situacao-2/` | Índice da Situação 2, links (repositório, aplicação, vídeo), roteiro do vídeo | **Português** |
| `docs/situacao-3/` | Formulário de testes, testes dos usuários (PDF), relatório de testes, laudo de qualidade, evidências, roteiro do vídeo atualizado | **Português** |
| `PIT_atividade.docx` | Filled official submission template | Português |

**Read order for people and AI:** `CLAUDE.md` → `00` → `01` → `02` → `03` → `07` → `04` → `05` → `06` → `08`.

**Single-source rule:** each fact lives in one file; other files reference it by ID (BR-05, US-11, NFR-03…). The `situacao-*` folders summarize and link; they don't copy.

## 6. Language policy

| Content | Language |
|---|---|
| Code, identifiers, comments, commit messages, tests | English |
| All documentation outside `docs/situacao-*` | English |
| `docs/situacao-1/`, `situacao-2/`, `situacao-3/` | Brazilian Portuguese |
| Application UI text, error messages shown to users, seed product descriptions | Brazilian Portuguese |
| Product names | As defined in the seed (e.g. "Birthday Vanilla") |

## 7. Decision log

| ID | Date | Decision | Rationale / consequence |
|---|---|---|---|
| D-01 | 10 Oct | PIT I artifacts are created in this project as the planning baseline | Only the PIT I report exists; S-II p.31 asks to create or revise them |
| D-02 | 10 Oct | Mobile-first responsive **web** app | PIT II accepts "aplicação web ou mobile" (S-II p.38) |
| D-03 | 10 Oct | Standalone products; one category each; tags (Bestseller); stock quantities | Keeps the catalog simple; tags give a M:N relationship for the data model |
| D-04 | 10 Oct | **Store pickup only**; no delivery, address or fees | Smaller scope; no address table |
| D-05 | 10 Oct | ~~Simulated Pix only~~ (superseded by D-15) | n/a |
| D-06 | 10 Oct | Data model: `Customer`, `Order`, `OrderItem` (plus catalog entities); customer reused by phone; no data exposed by phone | Guest checkout without accounts; privacy |
| D-07 | 10 Oct | No accounts, no admin panel, no real payments, no email lookup; order code presented at pickup | Scope control |
| D-08 | 10 Oct | Only `situacao-*` docs in Portuguese; everything else in English; **UI text in Portuguese** | Graders read Portuguese evidence; users are Brazilian |
| D-09 | 10 Oct | No Figma; UI designed later with Claude's design tool | Tooling preference |
| D-10 | 10 Oct | **Back end: Node.js + TypeScript + Fastify** | Your choice. ⚠️ Not in the S-II p.34 list (see R-01). |
| D-11 | 10 Oct | ~~Stock decremented at payment confirmation; pending orders expire after 30 min~~ (superseded by D-16) | n/a |
| D-12 | 10 Oct | Public order page by code (first name only, no phone) for customer reopening and staff verification | The only way staff can verify an order without an admin panel |
| D-13 | 10 Oct | Diagrams as code (PlantUML/Mermaid) with SVG/PNG exports instead of Lucidchart files | Versioned, reviewable; no specific tool is mandated (S-I p.7) |
| D-14 | 10 Oct | Final due date 17 Nov 2026; single final submission of all three Situações | Drives the schedule below |
| D-15 | 10 Oct | **Payment at the store**, at pickup; no online payment or payment screen | Owner's design brief; removes the Pix simulation (BR-09) |
| D-16 | 11 Oct | Stock decremented atomically **when the order is created**; order starts as AWAITING_PICKUP; ready in ~15 min (derived); no expiry | Follows from D-15; still no background jobs (BR-10…BR-12) |
| D-17 | 11 Oct | **Latest order remembered in the browser** (`localStorage`, code only): home card while awaiting pickup today; no "Meus pedidos" list and no separate confirmation page; Meu pedido is shown right after ordering | Owner's design corrections; no accounts needed (BR-19) |
| D-18 | 11 Oct | Approved visual system: Plus Jakarta Sans, 8px radius everywhere, flat buttons (no shadows), typography-only logo, six real product photos; seed reduced to the six photographed products | Owner's design corrections; see 04-ui-design-system.md |
| D-19 | 11 Oct | Design system expressed as the **standard Tailwind CSS v4 + shadcn/ui theme** in one `globals.css` (shadcn variables, flattened 8px radius scale, no shadows); no custom tokens or component variants | Owner's request; easier to build and maintain; small pixel deviations from the mockups accepted |
| D-20 | 11 Oct | **Hosting: Vercel + Neon.** Next.js and Fastify as two Vercel projects (Fastify zero-config function, Fluid compute); PostgreSQL 16 on Neon; browser calls the API through a same-origin `/api` rewrite | Git deploys, previews, rollback, free tiers, no servers (R-04); see 02-architecture §10 |
| D-21 | 11 Oct | **Contract first:** `openapi.yaml` is authored by hand and drives web types (`openapi-typescript`) and contract tests; shared Zod schemas for validation; Prisma ORM 7 (not the Prisma 8 RC) | Spec-driven development; Prisma 8 lacks atomic decrement and nested writes |
| D-22 | 11 Oct | **Execution plan approved (gate G0, E0-01).** E0-02 open items closed: add an LGPD purpose line at checkout (closes A-08); approve the five *(proposed)* copy strings as final; **remove** the desktop-only checkout subtitle "Só nome e celular. Sem cadastro." everywhere (supersedes UI doc G-1) | Owner approval, 11 Oct 2026; see `04-ui-design-system.md` v1.2 changelog |

## 8. Assumptions and open items

| ID | Item | Default used until confirmed |
|---|---|---|
| A-01 | Maximum 20 units per product line (BR-06) | 20 |
| A-02 | Low-stock display threshold | ≤ 5 units |
| A-03 | Store brand name, address and opening hours (fictional, shown at pickup) | "Cupcake Store", "Rua das Flores, 123 · Centro · São Paulo, SP", "Ter a dom, 10h às 19h" (placeholders in one config module) |
| A-04 | Seed catalog | ✅ Six photographed cupcakes in `03-data-model.md` §8; photos in `docs/design/assets/photos/` |
| A-05 | All three Situações are submitted together on 17 Nov (no intermediate deadlines) | Confirm in the course platform |
| A-06 | Institutional policy on disclosing AI assistance | Disclose it in the README |
| A-07 | Category and tag `name` hold the pt-BR UI label (Clássicos, Frutados, Mais vendido); `slug` holds the English identifier | Per D-08 (UI text in Portuguese) |
| A-08 | ✅ LGPD purpose notice at checkout (NFR-06) | **Resolved (D-22, 11 Oct):** one line under "Seus dados" — "Usamos seu nome e celular só para preparar e confirmar seu pedido na loja." (`04-ui-design-system.md` §9.3 `privacy.notice`) |
| A-09 | Orders never collected keep their stock reserved (no staff tool, no expiry) | Accepted for the MVP; staff adjust stock through the seed/DB; future staff tool |

## 9. Risks

| ID | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| **R-01** | **The back-end language isn't on the course's suggested list** ("Java, PHP, C#, .NET ou Python", S-II p.34) | Medium / High | Recommended: send the tutor a short confirmation request and keep the reply in `docs/situacao-1/`. Explain the MVC structure in `02-architecture.md`. Keep business logic in plain TypeScript services so it is easy to explain. |
| R-02 | Tight timeline (5.5 weeks) with ~136 h of estimated implementation effort | High / High | AI-generated implementation from specs; release cut defined in the PRD (§9); cut list starting 29 Oct |
| R-03 | Testers unavailable in the validation window | Medium / High | Recruit 5 + 1 spare by 31 Oct; send the link and form on 7 Nov |
| R-04 | Hosting cold starts or free-tier limits during testing and video recording | Medium / Medium | Deploy the walking skeleton early (24 Oct); warm up before sessions; health check |
| R-05 | Inconsistency between diagrams, PRD and code | Medium / Medium | IDs everywhere; consistency check at the end of each phase |
| R-06 | Real personal data from testers | Low / Medium | Collect only name and phone; testers may use fictitious data; consent for names in the test PDF; see A-08 |
| R-07 | Implementation drifts from the approved UI | Medium / Medium | Screenshots and reference HTML in `docs/design/`; CLAUDE.md requires visual comparison at 390 px and 1280 px before a screen is done |

## 10. Schedule and milestones

Working assumption: about 20 h/week. Each phase ends with a review checkpoint.

| Phase | Dates (2026) | Content | Milestone |
|---|---|---|---|
| P0 · Decisions | 10 Oct | Approval checkpoints 1–2 | ✅ Done |
| **P1 · Planning baseline** ✅ | 10–13 Oct | Overview, PRD (22 user stories, BRs, NFRs, affinity map, backlog, tasks), `CLAUDE.md` | PRD approved **13 Oct** |
| **P2 · Modeling** ✅ (updated 11 Oct for the approved UI) | 14–18 Oct | Use case diagram, expanded use cases, class + package diagrams, sequence + activity diagrams; conceptual/logical/physical DB, normalization, data dictionary, seed catalog definition | UML + DB approved **18 Oct** |
| **P3 · UX design** ✅ UI approved 11 Oct | 15–21 Oct | User flow, navigation map, conceptual map, design system, screen specs, pt-BR copy, error-message map, mockups (Claude Design), exported to `docs/design/`; **peer critique (19–21 Oct)** still pending | **Situação 1 complete, 21 Oct** |
| **P4 · Architecture + skeleton** (documents delivered 11 Oct; skeleton pending) | 20–24 Oct | `02` architecture, `07` API spec, `05` testing strategy, `06` workflow; monorepo scaffold, migrations + seed, CI, walking skeleton deployed | Skeleton live **24 Oct** |
| **P5 · Implementation** | 25 Oct – 3 Nov | Back end + front end per the backlog order, with tests; cut-list check **29 Oct** | Feature complete **3 Nov** |
| **P6 · Verification** | 4–6 Nov | Test report (V&V), user manual, production deploy, narrated video (≥ 5 min) | **Situação 2 complete, 6 Nov** |
| **P7 · Validation** | 7–14 Nov | **Tester window 7–10 Nov** (form + link); test PDF; fixes 10–13 Nov; quality report; updated video (≤ 5 min) | **Situação 3 complete, 14 Nov** |
| **P8 · Submission** | 15–16 Nov | Fill in `PIT_atividade.docx`, check every link logged out, tag release, submit | **Submitted by 16 Nov** (buffer: 17 Nov) |

Key dates to put in your calendar:

- **13 Oct:** approve the PRD
- **19–21 Oct:** collect at least 2 colleague critiques of the plan
- **24 Oct:** first public URL
- **31 Oct:** 5 testers (+1 spare) confirmed
- **3 Nov:** feature freeze
- **7–10 Nov:** testing window
- **16 Nov:** submit

## 11. Glossary

| Term | Meaning |
|---|---|
| **PIT** | Projeto Integrador Transdisciplinar, the course's integrative project |
| **Situação (1/2/3)** | One of PIT II's three challenge stages |
| **RGM** | Student registration number |
| **Meu pedido** | The order page shown right after ordering and when reopened (`/orders/{code}`) |
| **Latest-order card** | Home-page card for the most recent order placed in this browser while it awaits pickup |
| **Order code** | Public, non-sequential identifier of an order (`CUP-XXXXXX`), presented at pickup |
| **Pickup** | Collecting the order at the store counter |
| **Stock** | Units of a product available for sale |
| **Awaiting pickup** | The status of a placed order until it is collected (and paid) at the store |
| **Ready time** | Order creation time + 15 minutes (derived) |
| **DDD** | Brazilian 2-digit telephone area code |
| **E.164** | International phone number format, e.g. `+5511912345678` |
| **BRL cents** | Monetary values stored as integers in centavos (R$ 12,50 = 1250) |
| **MVC** | Model–View–Controller architectural pattern required by the course |
| **V&V** | Verification (built right, against specs) and Validation (right product, with users) |
| **LGPD** | Lei Geral de Proteção de Dados, Brazil's data protection law |
