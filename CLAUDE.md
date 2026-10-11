# CLAUDE.md: AI working rules for Cupcake App

This file tells Claude Code (and any other AI assistant) how to work in this repository. Read it fully before every task.

## 1. What this project is

A small, mobile-first cupcake web store for a Software Engineering college assignment (PIT II).

Customer journey: browse catalog → cart → name + phone (guest) + order summary → place order → **Meu pedido** with the order code → pickup and **payment at the store** (no online payment).

The project is specification-driven: **the docs define the product; the code implements the docs.**

## 2. Read before working

Read in this order and treat them as authoritative:

1. `docs/00-project-overview.md`: context, decisions (D-xx), risks, schedule, glossary
2. `docs/01-prd.md`: scope, business rules (BR-xx), NFRs (NFR-xx), user stories (US-xx) with acceptance criteria
3. `docs/02-architecture.md`: layering, stack and versions, repository layout, order transaction, error model, security, configuration, environments
4. `docs/03-data-model.md`: entities, constraints, data dictionary; DDL in `docs/diagrams/database/physical-model.sql`
5. `docs/07-api-spec.md` + `docs/openapi.yaml`: endpoint contract (OpenAPI 3.1 is the source of truth for request/response shapes)
6. `docs/04-ui-design-system.md` + `docs/design/`: **approved UI**: tokens, components, screen specs, pt-BR copy, error-message map, screenshots and reference HTML for every screen
7. `docs/05-testing-strategy.md` (test levels, AC traceability, gates) and `docs/06-development-workflow.md` (setup, branching, CI, migrations, deployment)
8. `docs/08-execution-plan.md`: **the task you're working on** (phases E0–E10, task cards, dependencies, acceptance criteria, gates, progress tracker). Work only on the next task whose dependencies are done.

If a document marked with a phase doesn't exist yet, **don't invent its content**. Ask, or work only from what exists.

## 3. Golden rules

1. **Don't invent requirements.** If something isn't in the docs, stop and ask. Don't add features, fields, endpoints, screens or dependencies "because they're usual".
2. **Respect the out-of-scope list** (PRD §4). In particular: no accounts or login, no admin panel, **no online payment of any kind** (no Pix, card or payment screens), no delivery or addresses, no lookup by phone or email, no order-history list.
3. **Docs and code change together.** If an implementation decision changes behavior, update the owning doc in the same change and add a change-log line. Never let code silently diverge from the spec.
4. **Single source of truth.** Reference IDs (BR-05, US-11) instead of copying rules between files.
5. **Prefer the simplest design that satisfies the spec.** No abstractions created only to "show" SOLID or MVC: no interfaces with one implementation, no generic repositories, no factories without a need.
6. **Traceability.** Tests name the story or rule they verify (e.g. `describe('BR-11 stock reservation')`). Commit messages reference IDs when relevant.
7. **Payment at the store.** The app never takes or simulates payment. It shows "Pagamento na loja" and "Total a pagar na loja" (BR-09, NFR-12).
8. **Privacy.** Never log or return phone numbers in public responses. Public order views show the first name only (BR-16, NFR-06).

## 4. Language rules

| Content | Language |
|---|---|
| Code, identifiers, comments, commits, tests, docs (except below) | **English** |
| `docs/situacao-1/`, `docs/situacao-2/`, `docs/situacao-3/` | **Brazilian Portuguese** |
| Text visible to app users (labels, messages, toasts, errors, seed descriptions) | **Brazilian Portuguese**, taken from `04-ui-design-system.md` |

Don't hard-code user-facing strings that differ from the copy in `04-ui-design-system.md`. If copy is missing, propose it and flag it.

## 5. Architecture rules (MVC)

```
apps/web  (Next.js)  → VIEW: pages and components; calls the API through a typed client; no business rules
apps/api  (Fastify)  → routes (ROUTER) → controllers (CONTROLLER) → services (business rules) → models/repositories (MODEL, Prisma)
packages/database    → Prisma schema, migrations, seed
```

- **Controllers:** validate input (schema), call one service, map the result or error to HTTP. No business logic, no Prisma calls.
- **Services:** implement the business rules (BR-xx). They are pure TypeScript plus repository calls. Domain errors are thrown as typed errors with stable codes.
- **Models/repositories:** Prisma access only. No HTTP knowledge.
- **Errors:** every error response uses the standard shape and code list defined in `02-architecture.md`. A single global error handler maps errors to HTTP. Never leak stack traces.
- **Money:** integer cents everywhere; format only in the UI (pt-BR, `R$ 12,50`).
- **Server is the authority:** recompute prices and totals and re-validate stock on the server (BR-05, BR-07, BR-11).
- **Transactions:** order creation runs in one DB transaction; the stock decrement inside it is conditional and atomic (BR-11).

## 6. Coding conventions

- TypeScript `strict`. No `any` without a comment explaining why.
- Names: `camelCase` for variables/functions, `PascalCase` for types/components, `kebab-case` for file names, `SCREAMING_SNAKE_CASE` for enum values and error codes.
- Small modules, explicit imports, no barrel files that hide dependencies.
- Validation schemas shared between web and API where it avoids duplication (e.g. phone/name rules from BR-14).
- Accessibility is part of done: labels, focus, contrast, 44 px targets (NFR-03).
- Mobile-first CSS: design at 360 px first, then scale up (NFR-01).

## 6a. UI implementation rules (approved design)

The UI was approved in Phase 3. Build it to match, not to reinterpret.

- **Where to look:** `docs/04-ui-design-system.md` (behavior, components, copy) → `docs/design/screenshots/*.png` (visual target) → `docs/design/screens/*.html` (exact values, open in a browser). Map: SCR-01 = `01`, `02`, `08` · SCR-02 = `03` · SCR-03 = `04`, `06`, `09` · SCR-04 = `05` · states = `07`.
- **Standard Tailwind CSS v4 + shadcn/ui:** copy `docs/design/theme/globals.css` to `apps/web/src/app/globals.css`; it holds the whole design system (shadcn color variables, 8px radius for every `rounded-*` step, no shadows, font). Use shadcn components with their **standard variants and sizes** and Tailwind's **default scales and palette**. Don't add component variants, custom utilities, `@theme` extensions, arbitrary values (`text-[15px]`, `bg-[#…]`) or raw hex. Change the look only by editing `globals.css`. Font: Plus Jakarta Sans via `next/font/google`.
- **Fixed visual rules:** 8px radius everywhere (`rounded-full` only for the cart count and the success check); 1px borders; flat buttons without shadows (only the Sonner toast has `shadow-lg`); wordmark "Cupcake Store" with no icon; real photos from `docs/design/assets/photos/` (copy to `apps/web/public/images/products/<slug>.jpg`); Lucide icons via `lucide-react`.
- **Don't add** headings, helper texts, icons, sections or features that aren't in the reference (e.g. no heading repeating the selected filter, no status badge on Meu pedido, no history icon in the header).
- **Reference files are static mockups:** sample data and fixed artboard sizes. Pages are fluid (360–1440 px, no horizontal overflow) and data comes from the API, the cart store and `lastOrderStore` (BR-19).
- **Translate, don't paste:** the reference HTML uses pixel values; use the Tailwind mapping in §4 of the UI doc and the shadcn component recipes in §6. Never paste `style="…"` blocks. Keep `components/ui/*` exactly as generated by the shadcn CLI.
- **Verify visually** before marking a screen done: run the app, open the same screen at 390 px and 1280 px, and compare with the screenshot (Playwright screenshots are fine). Note any intended difference in the PR.

## 7. Testing rules

- Every business rule has unit tests. Every endpoint has integration tests against a real PostgreSQL test database, including error paths.
- Don't mock the database in integration tests. Do mock time where the ready time (BR-12) or the "today" rule (BR-19) matters.
- Every acceptance criterion in the PRD should map to at least one automated test or a documented manual check.
- Tests must pass locally and in CI before a task is considered done.

## 8. Definition of done (per task)

- [ ] Implements exactly the referenced US/BR; nothing extra
- [ ] Acceptance criteria satisfied and tested
- [ ] Lint, type-check and all tests pass
- [ ] Loading, empty and error states handled where relevant
- [ ] UI copy matches `04-ui-design-system.md` (pt-BR)
- [ ] Screens match the approved reference (see §6a): compared side by side with `docs/design/screenshots/` at 390 px and 1280 px
- [ ] Docs updated if behavior or contracts changed
- [ ] No personal data in logs; no secrets committed

## 9. Workflow

- Work one **execution-plan task** at a time (`docs/08-execution-plan.md`), in dependency order, and stop at every gate for the owner's approval.
- Before coding: restate the story, list the files you'll touch and the tests you'll write, and confirm when anything is ambiguous.
- Commits: Conventional Commits (`feat(api): reserve stock on order creation (US-15, BR-11)`).
- Never run destructive commands against shared or production databases. Never commit `.env` files.
- When unsure whether something is in scope: **ask**.

## 10. Current phase

**Phase 5: Implementation. E1, E2, E3-01, E3-02 done; E3-03 (walking skeleton) in its PR, then gate G1; next is E4-01 (Catalog API).** (execution plan gate G0 approved 11 Oct 2026, see `docs/08-execution-plan.md` §16 gate log/tracker). E0-03/06 (tutor message, Situação 1 package) are still open owner-side tasks; E0-04/05 are effectively done (repo, Vercel and Neon live). GitHub repo `tiagopacedev/cupcake-app`; branch protection on `main` requires `quality` + `test`.
Available: `00` (v1.5), `01` (v1.2), `02`, `03` (v1.1), `04` (v1.2, approved UI) with `docs/design/`, `05`, `06` (v1.2), `07` + `openapi.yaml`, `08` (v1.3, execution plan), `docs/diagrams/` (see its README). Code: `apps/web`, `apps/api`, `packages/shared`, `packages/database` scaffolded and tested. Hosting: one Vercel project `cupcake-app` (`web` + `api` Services, functions in `gru1`), Neon project `cupcake-app` (`main` = production, `preview` = PR previews, both migrated and seeded). `shared` and `database` export compiled `dist/` (built on `pnpm install`); rebuild them after editing (`06-development-workflow.md` §6).
