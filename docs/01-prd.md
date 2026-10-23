# 01 · Product Requirements Document (Agile Specification)

| | |
|---|---|
| **Product** | Cupcake Store: mobile-first web store for cupcakes with store pickup |
| **Owner** | Tiago Pace Greggio (RGM 34852191) |
| **Version** | 1.6 (22 Oct 2026) |
| **Status** | Approved; updated after user validation (opening hours, order expiry, several active orders) |
| **Related** | [00-project-overview.md](00-project-overview.md) · [04-ui-design-system.md](04-ui-design-system.md) (approved UI) · affinity map in [diagrams/planning/](diagrams/planning/) |

This document is the **single source of truth** for scope, business rules (BR), non-functional requirements (NFR), user stories (US), acceptance criteria (AC), the product backlog and the task breakdown. Other documents reference these IDs instead of restating them.

It also serves as the **PIT I agile specification baseline** (user story cards, affinity map, prioritized backlog, tasks), produced during PIT II Situação 1 as the course instructions allow.

> **Language policy:** this document is written in English. The application's **UI text is Brazilian Portuguese (pt-BR)**. Exact UI copy and error messages are defined in [`04-ui-design-system.md`](04-ui-design-system.md), not here.

---

## 1. Problem and goal

A gourmet cupcake shop's previous app was withdrawn after customer complaints: requirements were poorly elicited and the app didn't work (PIT I scenario). The shop needs a **simple, reliable way for customers to order cupcakes online and collect them in the store**.

**Goal:** a customer can find cupcakes, choose quantities, place an order with only their name and phone number, and receive an order code to present at the store, where they **pay and collect** the order, comfortably on a phone.

### Success criteria (for this academic release)

1. A first-time user completes the full journey on a phone without help (validated by the 5 testers).
2. No order can be placed for more units than are in stock.
3. Every error situation shows a clear pt-BR message and a way to recover.
4. All acceptance criteria in this document pass and are evidenced in the test report.

## 2. Users

| Persona | Description | Main need |
|---|---|---|
| **Customer** (primary) | Smartphone user buying cupcakes for themselves or an occasion; no interest in creating an account | Order quickly, know what's available, know where and when to pick up |
| **Store staff** (secondary) | Store employee at the counter | Find the order for a presented code, charge the total and hand over the right items |
| **Store owner** (stakeholder) | Business owner burned by the previous app | A dependable store with an accurate catalog and stock |

## 3. Customer journey

1. Browse cupcakes (filters) and select quantities on the product cards.
2. Review the cart.
3. Enter name and phone number (no account) and review the full order summary.
4. Place the order. The app shows **Meu pedido** with a unique order code and when the order will be ready: about 15 minutes when the store is open, otherwise shortly after the next opening.
5. Visit the store, present the code, **pay at the counter** and collect the order (offline step; staff check the order page).
6. While orders await pickup, the home page shows a card for each one that reopens **Meu pedido** (stored in this browser only). Orders not collected by closing time expire.

## 4. Scope

### In scope (MVP)

- Catalog with filters: **All Cupcakes, Bestsellers, Classics, Chocolate, Fruity**
- Product cards with description, price, stock state and a quantity selector
- Cart persisted in the browser
- Guest checkout (name + phone) with the full order summary visible before placing the order
- Payment **at the store** when collecting the order; the app shows the amount to pay
- **Meu pedido** page (after placing the order and when reopened): order code, items, total to pay at the store, pickup address and hours
- Order cards on the home page while those orders await pickup (browser-stored, up to 5 active orders)
- Pickup time that respects the store's opening hours; unclaimed orders expire at closing time and release their stock (BR-12, BR-20)
- Staff API (no UI) to mark an order as picked up (BR-21)
- Store address and hours in the footer, at checkout and on Meu pedido
- Loading, empty, success and error states; not-found and generic error pages
- Seeded catalog (categories, tags, products, stock)

### Out of scope

| Item | Note |
|---|---|
| Customer accounts, login, passwords | Guest checkout only |
| Admin panel; product, stock and order management UI | Catalog and stock maintained through the seed script; store hours in one configuration module. Holidays and extraordinary closures are future work |
| A staff screen to mark an order as picked up; recording payment | Handover is recorded only through the protected staff API, without any UI (BR-21). Payment is never recorded (BR-09) |
| Any online payment (Pix, card, wallets) or payment screen | Payment happens at the counter (BR-09) |
| Order history list ("Meus pedidos"), recovery of orders on another device, and a separate confirmation page | Only the active orders of this browser (max 5) are remembered, as cards on the home page (BR-19). Another device opens the order by its link `/orders/{code}` |
| Home delivery, addresses, delivery fees | Store pickup only |
| Order lookup by phone or email | Order code only |
| Product variants, sizes, add-ons | Each cupcake is a standalone product |
| Coupons, reviews, favorites, text search, notifications (email/SMS/WhatsApp) | Not required |
| Separate product details page | Product card carries the details |

---

## 5. Business rules

| ID | Rule |
|---|---|
| **BR-01** | Each cupcake is a **standalone product** (e.g. Birthday Vanilla, Chocolate Crush, Strawberry Kiss). There are no sizes, variants or add-ons. |
| **BR-02** | Each product belongs to **exactly one category**: Classics, Chocolate or Fruity. |
| **BR-03** | A product can have **zero or more tags** describing characteristics (e.g. *Bestseller*). Catalog filters: **All Cupcakes** = every active product; **Bestsellers** = active products with the Bestseller tag; **Classics / Chocolate / Fruity** = active products in that category. |
| **BR-04** | Each product has a **stock quantity** (an integer ≥ 0). A product with stock 0 is shown as **sold out** and can't be added to the cart. Inactive products are never shown. |
| **BR-05** | The quantity of a product in the cart and in an order **can't exceed its available stock**. The client enforces this for usability; the **server re-validates it** when the order is created. |
| **BR-06** | The quantity per product line is an integer from **1 to min(stock, 20)**. *(The cap of 20 is an assumption to prevent absurd orders; see overview, open items.)* When the cap of 20 (not the stock) is the limit, the UI tells the customer to talk to the store for larger orders. |
| **BR-07** | Prices are stored as **integer cents in BRL**. The **server computes** line totals and the order total from database prices and ignores any client-sent price. Each order item stores the **unit price at the time of purchase**. |
| **BR-08** | **Store pickup only.** There are no delivery options, addresses or fees. Order total = Σ (unit price × quantity). |
| **BR-09** | **Payment happens at the store**, at the counter, when the customer collects the order. The app processes **no payment** and has no payment screen. It shows the amount to pay ("Total a pagar na loja") and states "Pagamento na loja" at checkout. Payment is not recorded in the MVP. |
| **BR-10** | When the customer places the order, the system creates it with pickup status **AWAITING_PICKUP**. It later becomes **PICKED_UP** (BR-21) or **EXPIRED** (BR-20); both are final. Each checkout submission creates a new order. |
| **BR-11** | Order creation happens in **a single transaction**: the system **decrements stock atomically** for each item, but only if enough stock remains, then upserts the customer and inserts the order and its items. If any item lacks stock, nothing changes, no order is created and the customer is told which items are affected and how many are available. Stock is given back only when the order expires (BR-20). |
| **BR-12** | **Pickup schedule:** the store has opening hours per weekday and a preparation time (15 min), both kept in one configuration module (`packages/shared/src/store.ts`). The server computes `readyAt` as the first moment at least the preparation time after the order, inside opening hours, leaving the customer at least the preparation time before closing (`readyAt <= closesAt - preparation time`). An order placed while the store is closed (or too close to closing) is **accepted** and ready at the next opening plus the preparation time; a closed weekday is skipped. The server also stores `expiresAt`, the closing time of the pickup day (BR-20). The UI shows "Pronto em ~15 min" when the store is open and the pickup is imminent, otherwise the day and time ("Pronto amanhã às 10:15"), and "pronto às HH:mm" on Meu pedido. |
| **BR-13** | Each order has a **unique, non-sequential, human-readable code** in the format `CUP-XXXXXX`, where X comes from an alphabet without ambiguous characters (no 0/O, 1/I/L). The database ID is never exposed. |
| **BR-14** | Customer data: **name** is required, 2–80 characters after trimming. **Phone** is required and must be a Brazilian mobile number (2-digit area code + 9 digits starting with 9), stored normalized in E.164 format (`+55DD9XXXXXXXX`). |
| **BR-15** | On order creation, the system looks up a customer by normalized phone. If one exists, it's **reused** and its name is updated to the name just provided; otherwise a new customer is created. |
| **BR-16** | **Privacy:** a phone number never reveals personal data or order history. No feature searches orders or customers by phone. Public order views show the customer's **first name only** and never the phone number. |
| **BR-17** | The cart lives in the customer's browser and survives page reloads. It's **cleared after the order is created**. Cart quantities are adjusted (and the customer informed) when stock has dropped below the cart quantity. |
| **BR-18** | **Pickup:** the customer presents the order code; staff open the order page for that code, check that it shows **AWAITING_PICKUP**, gather the listed items, **charge the total** and hand over the order, then mark it as picked up through the staff API (BR-21). Payment is never recorded (BR-09). |
| **BR-19** | **Active orders in the browser:** after an order is created, the browser stores **only its code and creation time** in `localStorage` (key `cupcake.orders`), newest first, **up to 5**; the oldest is dropped beyond that. The home page shows one card per stored order that the API returns as **AWAITING_PICKUP**, regardless of the day it was placed. A code the API doesn't know, or that is PICKED_UP or EXPIRED, is removed; a network error hides the card without removing the code. The former key `cupcake.lastOrder` is migrated once. **Limitations:** the cards exist only in that browser on that device, disappear if browser data is cleared, and are not an account or order history; to open an order elsewhere the customer types its link `/orders/{code}`. |
| **BR-20** | **Expiry:** an order still AWAITING_PICKUP at its `expiresAt` (closing time of its pickup day, BR-12) becomes **EXPIRED** and its reserved stock is **released exactly once**. There is no background job: overdue orders are expired when the API next handles a catalog, order creation, order view or staff request. An EXPIRED order stays viewable by its code. |
| **BR-21** | **Staff pickup:** `PATCH /api/orders/{code}/pickup` marks an AWAITING_PICKUP order as **PICKED_UP**. It requires a secret staff token (`Authorization: Bearer`), has no UI, and rejects orders that are already PICKED_UP or EXPIRED. Picked-up orders never release stock. |

## 6. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| **NFR-01** | Responsiveness | Mobile-first. Fully usable from **360 px to 1440 px** width with no horizontal scrolling. The primary action is reachable with one thumb on mobile. |
| **NFR-02** | Performance | Catalog Largest Contentful Paint ≤ **2.5 s** on a mid-range phone over 4G (Lighthouse mobile). API p95 response < **500 ms**, excluding hosting cold starts. |
| **NFR-03** | Accessibility | WCAG 2.1 **AA** basics: text contrast ≥ 4.5:1, labeled form fields, visible focus, keyboard operable, touch targets ≥ **44 × 44 px**, meaningful alt text, status messages announced to screen readers. |
| **NFR-04** | Localization | UI text in **pt-BR**. Currency formatted as `R$ 12,50`. Dates and times as `dd/mm/aaaa HH:mm` in the America/Sao_Paulo time zone. Phone input accepts common Brazilian formats (`(11) 91234-5678`). |
| **NFR-05** | Security | All input validated on the server. Rate limiting on order creation. CORS restricted to the web origin. HTTPS in production. No secrets in the repository. No stack traces in responses. |
| **NFR-06** | Privacy (LGPD) | Only name and phone are collected, for the sole purpose of identifying the order. Phone numbers are never logged or returned by public endpoints. The approved checkout has no purpose notice; adding one line is open item A-08 (overview). |
| **NFR-07** | Error handling | Every API error uses one standard error format with a stable error code. The UI maps each code to a pt-BR message and a recovery action (retry, go back, adjust cart). The UI never shows raw technical errors. |
| **NFR-08** | Data integrity | Order creation (stock decrement + order insert) is transactional. Database constraints enforce stock ≥ 0, prices > 0, quantities > 0, and unique order codes, slugs and phone numbers. |
| **NFR-09** | Maintainability | TypeScript in strict mode; MVC layering (routes → controllers → services → models); lint and format checks; no business logic in UI components or controllers. |
| **NFR-10** | Testability | Every business rule is covered by automated unit tests; every API endpoint is covered by integration tests, including its error paths. Tests run with a single command and in CI. |
| **NFR-11** | Compatibility | Latest 2 versions of Chrome (desktop and Android), Safari (iOS and macOS), Firefox and Edge. |
| **NFR-12** | Payment clarity | Before and after ordering, the customer can always see that payment happens **at the store** and the exact amount: checkout shows "Pagamento na loja"; Meu pedido shows "Total a pagar na loja". No screen suggests that an online payment was made. |

---

## 7. User story cards

Card format follows the PIT I template: ID, Title, Requester, Action, Comments, Acceptance criteria, Business rules, Non-functional requirements, Priority, Story points.

- **Priority scale:** **A** = essential to the purchase journey · **B** = important, expected by users · **C** = desirable · **D/E** = deferred (not used in this release)
- **Story points:** Fibonacci (1, 2, 3, 5, 8), relative effort
- **Acceptance criteria:** Given / When / Then

### Theme T1 · Catalog and discovery

#### US-01 · Browse the catalog
- **Requester:** Customer
- **Action:** As a customer, I want to see all available cupcakes when I open the store, so that I can choose what to buy.
- **Comments:** The home page is the catalog. While loading, show placeholders rather than a blank screen.
- **Acceptance criteria:**
  - **AC1:** Given active products exist, when I open the home page, then I see a card for every active product with its photo, name, price in BRL and short description.
  - **AC2:** Given the catalog is loading, when the page renders, then I see loading placeholders instead of an empty page.
  - **AC3:** Given the catalog can't be loaded (network or server error), when the request fails, then I see an error message with a "try again" action that reloads the catalog.
  - **AC4:** Given a product is inactive, when I view the catalog, then it isn't displayed.
- **Business rules:** BR-01, BR-04, BR-07
- **Non-functional requirements:** NFR-01, NFR-02, NFR-04, NFR-07
- **Priority:** A · **Story points:** 3

#### US-02 · Filter by category
- **Requester:** Customer
- **Action:** As a customer, I want to filter cupcakes by category (Classics, Chocolate, Fruity), so that I find the type I like faster.
- **Comments:** Filters are chips at the top of the catalog, in one row that scrolls horizontally on mobile **without a visible scrollbar**. "All Cupcakes" (Todos) is selected by default. The selected chip is the only indicator of the active filter: no heading repeats the filter name above the results.
- **Acceptance criteria:**
  - **AC1:** Given I'm on the catalog, when I select "Chocolate", then only active products in the Chocolate category are shown, the Chocolate chip is highlighted as selected, and no "Chocolate" heading is added above the results.
  - **AC2:** Given a category filter is selected, when I select "All Cupcakes", then all active products are shown again.
  - **AC3:** Given a category has no active products, when I select it, then I see an empty-state message with an option to view all cupcakes.
  - **AC4:** Given I selected a filter, when I reload the page or share the URL, then the same filter is applied.
  - **AC5:** Given I scroll down the catalog, when the chips would leave the screen, then they stay pinned at the top, so I can change the filter from anywhere in the list *(owner request, 11 Oct 2026)*.
- **Business rules:** BR-02, BR-03
- **Non-functional requirements:** NFR-01, NFR-03
- **Priority:** A · **Story points:** 2

#### US-03 · See bestsellers
- **Requester:** Customer
- **Action:** As a customer, I want a "Bestsellers" filter, so that I can quickly pick the most popular cupcakes.
- **Comments:** Bestseller is a tag, not a category. A product can be a bestseller and belong to any category. Bestseller products also show a small badge on their card.
- **Acceptance criteria:**
  - **AC1:** Given some products have the Bestseller tag, when I select "Bestsellers", then only active products with that tag are shown, regardless of category.
  - **AC2:** Given a product has the Bestseller tag, when it appears in any filter, then its card shows a bestseller badge.
- **Business rules:** BR-03
- **Non-functional requirements:** NFR-03
- **Priority:** B · **Story points:** 2

#### US-04 · Understand availability
- **Requester:** Customer
- **Action:** As a customer, I want to see whether each cupcake is available, so that I don't try to buy something that's sold out.
- **Comments:** Three visual states: available, low stock (≤ 5 units, showing "only N left"), sold out. The low-stock threshold is a UI concern, not a business rule.
- **Acceptance criteria:**
  - **AC1:** Given a product has stock 0, when I view its card, then it's marked as sold out and its add-to-cart control is disabled.
  - **AC2:** Given a product has stock between 1 and 5, when I view its card, then I see how many units are left.
  - **AC3:** Given a product has stock above 5, when I view its card, then no stock warning is shown.
- **Business rules:** BR-04
- **Non-functional requirements:** NFR-03 (state not conveyed by color alone)
- **Priority:** A · **Story points:** 2

### Theme T2 · Cart

#### US-05 · Choose quantity and add to cart
- **Requester:** Customer
- **Action:** As a customer, I want to add cupcakes to my cart and adjust how many I want right on the product card, so that I can buy several at once.
- **Comments:** Each available card has a "+" button on its photo. Once the product is in the cart, the button becomes a stepper (− n +) showing the cart quantity, so the card edits the cart directly.
- **Acceptance criteria:**
  - **AC1:** Given an available product that isn't in my cart, when I tap "+", then the cart contains 1 unit, the card shows the stepper with 1, and I see the toast "Adicionado ao carrinho" with a "Ver carrinho" link.
  - **AC2:** Given the product is in my cart with quantity 2, when I tap "+" on its stepper, then the cart quantity becomes 3 (subject to US-06).
  - **AC3:** Given the card stepper shows 1, when I tap "−", then the product is removed from the cart and the card shows the "+" button again.
- **Business rules:** BR-05, BR-06
- **Non-functional requirements:** NFR-01, NFR-03
- **Priority:** A · **Story points:** 3

#### US-06 · Respect stock limits
- **Requester:** Customer
- **Action:** As a customer, I want to be prevented from selecting more units than are in stock, so that I don't place an order the store can't fulfill.
- **Comments:** Applies to the card stepper and the cart. The server is the final authority (see US-19).
- **Acceptance criteria:**
  - **AC1:** Given a product has 4 units in stock, when I try to raise the quantity above 4, then the stepper stops at 4 and I see a message that only 4 units are available.
  - **AC2:** Given my cart holds 3 units of a product with stock 3, when I look at its card, then the "+" of the stepper is disabled and I see "Máximo disponível.".
  - **AC3:** Given a product has stock above 20, when I try to raise the quantity above 20, then the stepper stops at 20.
  - **AC4:** Given someone sends an order with a quantity above stock directly to the API, when the server validates it, then the order is rejected with an insufficient-stock error.
  - **AC5:** Given a product has stock above 20 and my quantity is 20, when I look at the card or the cart line, then I see "Máximo de 20 unidades. Para encomendas maiores, fale com a loja." (instead of "Máximo disponível.").
- **Business rules:** BR-05, BR-06
- **Non-functional requirements:** NFR-05, NFR-08
- **Priority:** A · **Story points:** 5

#### US-07 · See the cart count
- **Requester:** Customer
- **Action:** As a customer, I want to see a badge with the number of items in my cart in the header, so that I always know what I've selected.
- **Comments:** The count is the total units, not the number of distinct products.
- **Acceptance criteria:**
  - **AC1:** Given my cart has 2 units of A and 3 units of B, when I look at the header, then the cart badge shows 5.
  - **AC2:** Given my cart is empty, when I look at the header, then no badge number is shown.
- **Business rules:** BR-17
- **Non-functional requirements:** NFR-03 (badge has an accessible label)
- **Priority:** C · **Story points:** 1

#### US-08 · Review the cart and total
- **Requester:** Customer
- **Action:** As a customer, I want to review the items in my cart with their subtotals and the order total, so that I can confirm before checking out.
- **Comments:** No fees exist (pickup only), so total = sum of lines. The cart is a separate page from checkout.
- **Acceptance criteria:**
  - **AC1:** Given my cart has items, when I open the cart, then each line shows the product photo, name, unit price, a quantity stepper and the line subtotal, followed by the subtotal, "Retirada na loja · Grátis" and the total.
  - **AC2:** Given my cart is empty, when I open the cart, then I see an empty-cart message and a link back to the catalog, and I can't proceed to checkout.
  - **AC3:** Given my cart has items, when I choose to continue, then I'm taken to the checkout (Finalizar pedido).
  - **AC4:** Given a product's price changed since I added it, when I open the cart, then the cart shows the current price.
- **Business rules:** BR-07, BR-08, BR-17
- **Non-functional requirements:** NFR-01, NFR-04
- **Priority:** A · **Story points:** 3

#### US-09 · Edit cart items
- **Requester:** Customer
- **Action:** As a customer, I want to change quantities or remove items in my cart, so that I can adjust my order.
- **Comments:** Removing asks for confirmation (recoverable action). Setting quantity to 0 isn't possible; the customer uses remove instead.
- **Acceptance criteria:**
  - **AC1:** Given an item is in my cart, when I increase or decrease its quantity, then the line subtotal and total update immediately, within the limits of US-06.
  - **AC2:** Given an item is in my cart, when I choose remove and confirm, then the item disappears and totals update.
  - **AC3:** Given I choose remove, when I cancel the confirmation, then the item stays unchanged.
- **Business rules:** BR-05, BR-06
- **Non-functional requirements:** NFR-03
- **Priority:** A · **Story points:** 3

#### US-10 · Keep my cart
- **Requester:** Customer
- **Action:** As a customer, I want my cart kept when I reload or come back later on the same device, so that I don't lose my selection.
- **Comments:** Stored in the browser only (no account). Stock and price are refreshed from the server when the cart is shown.
- **Acceptance criteria:**
  - **AC1:** Given my cart has items, when I reload the page, then the same items and quantities are shown.
  - **AC2:** Given a cart item's stock dropped below my quantity, when I open the cart, then the quantity is reduced to the available stock and I'm told why.
  - **AC3:** Given a cart item became sold out or inactive, when I open the cart, then it's removed and I'm told which item was removed.
- **Business rules:** BR-04, BR-17
- **Non-functional requirements:** NFR-07
- **Priority:** B · **Story points:** 2

### Theme T3 · Checkout and identification

#### US-11 · Check out without an account
- **Requester:** Customer
- **Action:** As a customer, I want to place my order by providing only my name and phone number, so that I don't need to create an account.
- **Comments:** The checkout ("Finalizar pedido") has only two fields. Placing the order is specified in US-15; the summary in US-13.
- **Acceptance criteria:**
  - **AC1:** Given my cart has items, when I enter a valid name and phone and tap "Fazer pedido", then my order is placed (US-15) and I'm taken to Meu pedido.
  - **AC2:** Given my phone already belongs to an existing customer, when I place an order, then the existing customer record is reused and its name updated (I see no message about this).
  - **AC3:** Given I'm at checkout, when I view the form, then I see only the fields Nome and Celular: no account, password, address or payment fields.
  - **AC4:** Given my cart is empty, when I open the checkout directly, then I'm redirected to the cart.
  - **AC5:** Given I submit the form, when the request is in progress, then the button is disabled and shows "Enviando…", so the order can't be created twice.
- **Business rules:** BR-10, BR-14, BR-15, BR-16
- **Non-functional requirements:** NFR-05, NFR-06, NFR-08
- **Priority:** A · **Story points:** 5

#### US-12 · Get clear validation messages
- **Requester:** Customer
- **Action:** As a customer, I want clear messages when my name or phone number is invalid, so that I can fix them quickly.
- **Comments:** Validation happens on the client (on blur and on submit) and again on the server. Messages are shown next to the field.
- **Acceptance criteria:**
  - **AC1:** Given the name field is empty or shorter than 2 characters, when I try to continue, then I see a message next to the name field and the order isn't created.
  - **AC2:** Given I enter a phone that isn't a valid Brazilian mobile number, when I try to continue, then I see a message showing the expected format and the order isn't created.
  - **AC3:** Given I type the phone as `(11) 91234-5678`, `11912345678` or `+55 11 91234-5678`, when I continue, then it's accepted and stored as `+5511912345678`.
  - **AC4:** Given the server rejects a field, when the response arrives, then the server's error is shown next to the corresponding field.
- **Business rules:** BR-14
- **Non-functional requirements:** NFR-03, NFR-04, NFR-07
- **Priority:** A · **Story points:** 3

### Theme T4 · Order placement and payment at the store

#### US-13 · Review my order before placing it
- **Requester:** Customer
- **Action:** As a customer, I want to see exactly what I'm ordering at checkout, so that I can confirm items and total before placing the order.
- **Comments:** The order summary is never removed from checkout, on mobile or desktop (on desktop it sits beside the form).
- **Acceptance criteria:**
  - **AC1:** Given my cart has items, when I open the checkout, then I see a "Resumo do pedido" with each item's photo, name, quantity × unit price and line subtotal, followed by the subtotal, "Retirada na loja · Grátis" and the total.
  - **AC2:** Given I'm at checkout, when I tap "Editar" in the summary, then I return to the cart.
  - **AC3:** Given I'm at checkout while the store is open, when I look at the "Retirada" block, then I see the store address and "Pronto em ~15 min · Pagamento na loja".
  - **AC4:** Given I'm at checkout while the store is closed (or too close to closing), when I look at the "Retirada" block, then it shows when the order will be ready (for example "Pronto amanhã às 10:15") together with "Pagamento na loja", and I can still place the order.
- **Business rules:** BR-07, BR-08, BR-12
- **Non-functional requirements:** NFR-01, NFR-04, NFR-12
- **Priority:** A · **Story points:** 3

#### US-14 · Know I pay at the store
- **Requester:** Customer
- **Action:** As a customer, I want it to be clear that I pay when I collect the order, so that I'm not surprised and I know how much to bring.
- **Comments:** There is no online payment of any kind (BR-09).
- **Acceptance criteria:**
  - **AC1:** Given I'm at checkout, when I view the pickup block, then it says "Pagamento na loja".
  - **AC2:** Given I placed an order, when I view Meu pedido, then the total is labeled "Total a pagar na loja".
  - **AC3:** Given any screen of the app, when I use it, then no payment fields, payment codes or "paid" statuses are shown.
- **Business rules:** BR-09
- **Non-functional requirements:** NFR-12
- **Priority:** B · **Story points:** 1

#### US-15 · Place the order and reserve stock
- **Requester:** Customer
- **Action:** As a customer, I want my order registered and its cupcakes reserved when I tap "Fazer pedido", so that they're waiting for me at the store.
- **Comments:** This is the critical transaction: stock is decremented here (BR-11).
- **Acceptance criteria:**
  - **AC1:** Given valid data and enough stock, when I place the order, then the order is created as AWAITING_PICKUP, each product's stock decreases by the ordered quantity, my cart is cleared, the order code is saved in this browser (BR-19), and I'm taken to Meu pedido with the "Pedido feito!" notice.
  - **AC2:** Given the request is in progress, when I tap the button again, then no second order is created (the button is disabled).
  - **AC3:** Given a network error occurs, when it fails, then I see an error with a retry option, the button is re-enabled and my cart is intact.
  - **AC4:** Given two customers order the last units of a product at the same time, when both requests arrive, then only one order is created and the other customer gets the insufficient-stock flow (US-19).
- **Business rules:** BR-10, BR-11, BR-17, BR-19
- **Non-functional requirements:** NFR-05, NFR-07, NFR-08
- **Priority:** A · **Story points:** 8

### Theme T5 · My order and pickup

#### US-16 · Receive my order code
- **Requester:** Customer
- **Action:** As a customer, I want to receive a unique order code right after placing my order, so that I can collect it at the store.
- **Comments:** Shown on Meu pedido, centered and large, with "Mostre este código no balcão". No copy or share action (owner decision, 22 Oct 2026).
- **Acceptance criteria:**
  - **AC1:** Given my order was placed, when Meu pedido opens, then I see the "Pedido feito!" notice with the ready time ("Pronto em ~15 min." or, outside opening hours, for example "Pronto amanhã às 10:15."), the code in the format `CUP-XXXXXX`, my first name, the order time and the ready time, my items with quantities, and the total to pay at the store.
  - **AC2:** Given two orders are placed, when their codes are generated, then the codes are different and not sequential.
- **Business rules:** BR-12, BR-13
- **Non-functional requirements:** NFR-03, NFR-04
- **Priority:** A · **Story points:** 3

#### US-17 · See pickup instructions
- **Requester:** Customer
- **Action:** As a customer, I want to see where and when to collect my order, so that I know what to do next.
- **Comments:** Store name, address, opening hours and preparation time are fictional and kept in one configuration module (A-03).
- **Acceptance criteria:**
  - **AC1:** Given I placed an order, when I view Meu pedido, then I see "Onde retirar" with the store address, the opening hours and the day and time until which I can collect ("Retire até hoje, 19:00").
  - **AC2:** Given I'm browsing the catalog, when I scroll to the footer, then I see the store name, address and opening hours.
  - **AC3:** Given any page renders, then the header and footer appear on first paint, with no loading state.
- **Business rules:** BR-08, BR-12, BR-18
- **Non-functional requirements:** NFR-04
- **Priority:** B · **Story points:** 1

#### US-18 · Reopen my order with the code
- **Requester:** Customer
- **Action:** As a customer, I want to reopen Meu pedido later, so that I can show it at the store.
- **Comments:** Meu pedido has its own URL containing the code (`/orders/CUP-XXXXXX`). It shows the first name only and never the phone number. The same page is used right after ordering and when reopened.
- **Acceptance criteria:**
  - **AC1:** Given an order with code `CUP-7K3Q9F`, when I open its URL, then I see the code, items, total to pay at the store, pickup address and hours, and the customer's first name only.
  - **AC2:** Given a code that doesn't exist, when I open its URL, then I see "Pedido não encontrado" with "Voltar ao início".
  - **AC3:** Given I reopen an existing order (not right after placing it), when the page opens, then the "Pedido feito!" notice isn't shown; everything else is the same.
  - **AC4:** Given the order is EXPIRED, when I open its URL, then I see the notice "Este pedido expirou e as unidades foram liberadas."; given it is PICKED_UP, I see "Pedido retirado.".
- **Business rules:** BR-13, BR-16, BR-20, BR-21
- **Non-functional requirements:** NFR-06, NFR-07
- **Priority:** B · **Story points:** 3

#### US-22 · Find my active orders on the home page
- **Requester:** Customer
- **Action:** As a customer, I want the home page to show my orders that are still waiting for pickup, so that I can reopen any of them quickly without saving the codes.
- **Comments:** Compact, subtle cards between the header and the filter chips, one per active order (up to 5, newest first). The day an order was placed does not matter (BR-19).
- **Acceptance criteria:**
  - **AC1:** Given I placed an order in this browser and it's awaiting pickup, when I open the home page, then I see the card "Seu pedido · CUP-XXXXXX · Aguardando retirada".
  - **AC2:** Given I tap a card, when it opens, then I'm on Meu pedido for that code.
  - **AC3:** Given I have no stored order, or none is awaiting pickup (picked up or expired), when I open the home page, then no card is shown.
  - **AC4:** Given a stored code no longer exists on the server, or is picked up or expired, when the home page loads, then its card isn't shown and the code is removed from the browser.
  - **AC5:** Given I placed two orders, when I open the home page, then I see one card for each, newest first.
  - **AC6:** Given I placed an order on a previous day and it's still awaiting pickup, when I open the home page, then its card is shown.
  - **AC7:** Given I have placed more than 5 orders, when I open the home page, then only the 5 most recent are considered.
- **Business rules:** BR-19, BR-20
- **Non-functional requirements:** NFR-01, NFR-03
- **Priority:** B · **Story points:** 3

#### US-20 · Verify an order at pickup
- **Requester:** Store staff
- **Action:** As store staff, I want to open an order by its code, so that I hand the right cupcakes to the customer and charge the right amount.
- **Comments:** Staff use the same public order page as customers (US-18). No staff login in the app. Recording the handover is done through the staff API (US-24); recording payment is out of scope (BR-18).
- **Acceptance criteria:**
  - **AC1:** Given a customer presents code `CUP-7K3Q9F`, when staff open that order page, then they see the items and quantities to hand over and the "Total a pagar na loja" to charge.
  - **AC2:** Given the code doesn't exist, when staff open the page, then it shows "Pedido não encontrado".
- **Business rules:** BR-09, BR-16, BR-18
- **Non-functional requirements:** NFR-01, NFR-03
- **Priority:** B · **Story points:** 2

#### US-23 · Share my order code
- **Requester:** Customer
- **Action:** As a customer, I want to send my order code or link to myself or someone else, so that I can reopen the order on another browser or device.
- **Status:** **Removed** (owner decision, 22 Oct 2026). Added after user validation, then dropped to keep the order code block clean. The ID is kept so the other IDs don't change.

#### US-24 · Mark an order as picked up
- **Requester:** Store staff
- **Action:** As store staff, I want to mark an order as picked up after handing it over, so that it is not expired and its stock is not released.
- **Comments:** API only, no UI and no staff login (BR-21). The secret staff token is configured in the environment.
- **Acceptance criteria:**
  - **AC1:** Given an AWAITING_PICKUP order and a valid staff token, when `PATCH /api/orders/{code}/pickup` is called, then the order becomes PICKED_UP.
  - **AC2:** Given a missing or wrong token (or no token configured on the server), when the endpoint is called, then the response is 401 and nothing changes.
  - **AC3:** Given the order is already PICKED_UP or EXPIRED, when the endpoint is called, then the response is 409 and nothing changes.
  - **AC4:** Given an unknown code, when the endpoint is called with a valid token, then the response is 404.
  - **AC5:** Given a picked-up order, when its pickup day ends, then its stock is not released.
- **Business rules:** BR-10, BR-18, BR-21
- **Non-functional requirements:** NFR-06, NFR-07
- **Priority:** B · **Story points:** 3

### Theme T6 · Error handling and resilience

#### US-19 · Handle stock changes during checkout
- **Requester:** Customer
- **Action:** As a customer, I want to be told clearly if an item sold out or its stock dropped while I was checking out, so that I can adjust my order instead of being stuck.
- **Comments:** Happens when the order is placed (US-15). The response lists the affected products and their available quantities.
- **Acceptance criteria:**
  - **AC1:** Given my cart has 2 units of a product that now has 1 in stock, when I tap "Fazer pedido", then no order is created, no stock changes, and I see a notice such as "Chocolate Crush: só 1 disponível." with a "Revisar" action back to the cart.
  - **AC2:** Given I return to the cart after that notice, when the cart opens, then the affected quantities are adjusted to the available stock (US-10 AC2).
  - **AC3:** Given a product in my cart became inactive, when I place the order, then no order is created and I'm told which item was removed.
- **Business rules:** BR-05, BR-11
- **Non-functional requirements:** NFR-07, NFR-08
- **Priority:** A · **Story points:** 5

#### US-25 · Release stock of unclaimed orders
- **Requester:** Store owner
- **Action:** As the store owner, I want orders that were not collected by closing time to expire and give their units back to the catalog, so that stock is not blocked indefinitely.
- **Comments:** Added after user validation. No background job: expiry runs when the API handles a request (BR-20).
- **Acceptance criteria:**
  - **AC1:** Given an AWAITING_PICKUP order whose `expiresAt` has passed, when the catalog is requested, then the order is EXPIRED and each product's stock is increased by the ordered quantity.
  - **AC2:** Given two requests expire the same order at the same time, when both finish, then the stock was released exactly once.
  - **AC3:** Given an order placed after closing (ready tomorrow), when today ends, then it is not expired; it expires at closing time of the pickup day.
  - **AC4:** Given an expired order, when I open its URL, then it still shows, with the notice of US-18 AC4.
- **Business rules:** BR-11, BR-12, BR-20
- **Non-functional requirements:** NFR-07, NFR-08
- **Priority:** A · **Story points:** 5

### Theme T7 · Store setup

#### US-21 · Seed the catalog
- **Requester:** Store owner
- **Action:** As the store owner, I want the store loaded with categories, tags, products, prices, images and stock, so that it's ready to sell and to be tested.
- **Comments:** Technical story; there's no admin panel. The seed script must be idempotent so it can run in every environment.
- **Acceptance criteria:**
  - **AC1:** Given an empty database, when the seed script runs, then the categories Classics, Chocolate and Fruity, the tag Bestseller, and the 6 products of `03-data-model.md` §8 exist, each with price, stock and photo.
  - **AC2:** Given the seed has already run, when it runs again, then no duplicates are created.
  - **AC3:** Given the seeded catalog, when testers use the store, then it contains at least one bestseller per category, one low-stock product and one sold-out product, so every UI state can be tested.
- **Business rules:** BR-01, BR-02, BR-03, BR-04, BR-07
- **Non-functional requirements:** NFR-08
- **Priority:** A · **Story points:** 3

---

## 8. Affinity map

Stories grouped by theme. The diagram is in [`diagrams/planning/affinity-map.svg`](diagrams/planning/affinity-map.svg) (source: `affinity-map.mmd`). Card colors: pink = priority A, amber = B, green = C.

| Theme | Stories | Points |
|---|---|---|
| T1 · Catalog and discovery | US-01, US-02, US-03, US-04 | 9 |
| T2 · Cart | US-05, US-06, US-07, US-08, US-09, US-10 | 17 |
| T3 · Checkout and identification | US-11, US-12 | 8 |
| T4 · Order placement and payment at the store | US-13, US-14, US-15 | 12 |
| T5 · My order and pickup | US-16, US-17, US-18, US-22, US-20, US-24 | 15 |
| T6 · Error handling and resilience | US-19, US-25 | 10 |
| T7 · Store setup | US-21 | 3 |
| **Total** | **24 stories** | **74** |

US-23, US-24 and US-25 were added after user validation (E9-03, version 1.4); US-23 was removed on 22 Oct (version 1.6).

## 9. Prioritized product backlog

The order reflects dependencies first (the seed and catalog enable everything else), then journey-critical value.

| Rank | ID | User story | Points | Priority |
|---|---|---|---|---|
| 1 | US-21 | As the store owner, I want the catalog seeded so that the store is ready to sell | 3 | A |
| 2 | US-01 | As a customer, I want to see all available cupcakes so that I can choose | 3 | A |
| 3 | US-04 | As a customer, I want to see availability so that I don't pick sold-out items | 2 | A |
| 4 | US-02 | As a customer, I want to filter by category so that I find my type faster | 2 | A |
| 5 | US-05 | As a customer, I want to add cupcakes and adjust quantities on the card so that I can buy several | 3 | A |
| 6 | US-06 | As a customer, I want stock limits enforced so that my order can be fulfilled | 5 | A |
| 7 | US-08 | As a customer, I want to review my cart and total so that I can confirm before checkout | 3 | A |
| 8 | US-09 | As a customer, I want to edit cart items so that I can adjust my order | 3 | A |
| 9 | US-11 | As a customer, I want to check out with name and phone so that I need no account | 5 | A |
| 10 | US-12 | As a customer, I want clear validation messages so that I can fix my data | 3 | A |
| 11 | US-13 | As a customer, I want to review my order at checkout so that I know exactly what I'm buying | 3 | A |
| 12 | US-15 | As a customer, I want my order placed and its stock reserved so that it's waiting for me | 8 | A |
| 13 | US-16 | As a customer, I want an order code so that I can collect my order | 3 | A |
| 14 | US-19 | As a customer, I want to be told about stock changes during checkout so that I can adjust | 5 | A |
| 15 | US-17 | As a customer, I want pickup instructions so that I know where and when to go | 1 | B |
| 16 | US-18 | As a customer, I want to reopen Meu pedido so that I can show it at the store | 3 | B |
| 17 | US-22 | As a customer, I want my active orders on the home page so that I can reopen them quickly | 3 | B |
| 18 | US-20 | As store staff, I want to open an order by code so that I hand over and charge correctly | 2 | B |
| 19 | US-03 | As a customer, I want a Bestsellers filter so that I can pick popular items | 2 | B |
| 20 | US-10 | As a customer, I want my cart kept so that I don't lose my selection | 2 | B |
| 21 | US-14 | As a customer, I want to know I pay at the store so that I'm not surprised | 1 | B |
| 22 | US-07 | As a customer, I want a cart count badge so that I know what I've selected | 1 | C |
| 23 | US-25 | As the store owner, I want unclaimed orders to expire and release stock so that stock is not blocked | 5 | A |
| 24 | US-24 | As store staff, I want to mark an order as picked up so that it is not expired | 3 | B |

Ranks 23–24 come from user validation (E9-03) and ship in v1.1.0.

**Release cut:** ranks 1–14 (priority A, 51 points) make up the minimum journey and must be finished by **3 Nov** (feature complete). Ranks 15–22 (15 points) are planned for the same window and are the first to be simplified if time runs short.

## 10. Task breakdown

Tasks are estimated in hours (2–12 h each, as PIT I requires). IDs: `T-<story>-<n>`. Cross-cutting tasks use `T-X-<n>`. Estimates cover implementation and tests.

### Cross-cutting

| ID | Task | h |
|---|---|---|
| T-X-1 | Scaffold monorepo (web, api, database package), TypeScript strict, lint/format | 4 |
| T-X-2 | Prisma schema, first migration, local PostgreSQL via Docker | 4 |
| T-X-3 | Fastify app structure (routes/controllers/services/models), global error handler, standard error format | 5 |
| T-X-4 | CI pipeline (lint, type-check, unit + integration tests) | 3 |
| T-X-5 | Deploy walking skeleton (web + API + managed PostgreSQL), environment variables, CORS | 5 |
| T-X-6 | shadcn/ui init + `globals.css` theme from `docs/design/theme/` (Plus Jakarta Sans) + base layout (header, footer with store info), pt-BR formatting utilities | 5 |
| T-X-7 | Rate limiting, security headers, request logging without personal data | 3 |
| T-X-8 | End-to-end test of the full journey (Playwright) | 4 |

### Per story

| ID | Task | h |
|---|---|---|
| T-21-1 | Seed script: categories, tag, 6 products with photos, prices, varied stock; idempotent | 3 |
| T-21-2 | Seed tests (idempotency, required states present) | 2 |
| T-01-1 | `GET /products` endpoint + service + integration tests | 4 |
| T-01-2 | Catalog page: product grid, card component, loading and error states (screens 01, 07) | 5 |
| T-04-1 | Stock state logic (available / low / sold out) + card states + unit tests | 2 |
| T-02-1 | `GET /catalog/filters` endpoint + category/tag filtering in the product query + tests | 3 |
| T-02-2 | Filter chips (single row, hidden scrollbar), URL-synced selection, empty state | 3 |
| T-05-1 | Cart store (browser persistence) with add/merge logic + unit tests | 4 |
| T-05-2 | Card "+" button / stepper on the photo + add-to-cart toast | 3 |
| T-06-1 | Client-side quantity limits (stock, cap 20) in card stepper and cart + unit tests | 3 |
| T-06-2 | Server-side stock check shared by order creation + tests | 3 |
| T-08-1 | Cart page: lines with photo, subtotals, total, empty state, continue action | 4 |
| T-09-1 | Edit quantity / remove with confirmation | 3 |
| T-11-1 | `POST /orders`: validation, customer upsert by phone, totals, order code + integration tests | 6 |
| T-11-2 | Checkout form (Nome, Celular), submit handling ("Enviando…"), redirect guards | 3 |
| T-12-1 | Name/phone validation + phone normalization (shared schema) + unit tests | 3 |
| T-12-2 | Field-level display of client and server errors | 2 |
| T-13-1 | Checkout order summary + pickup block (mobile stacked, desktop aside) | 3 |
| T-15-1 | Atomic stock decrement inside the order-creation transaction + concurrency integration tests | 6 |
| T-15-2 | Submit flow: clear cart, save the order in the browser (BR-19), navigate to Meu pedido with `?new=1`, retry on error | 3 |
| T-16-1 | Order code generator (alphabet, uniqueness retry) + unit tests | 2 |
| T-16-2 | Meu pedido view: success notice, centered code with copy, items, total to pay at the store | 4 |
| T-19-1 | Insufficient-stock / inactive-product flows at checkout (notice, "Revisar", adjust cart) | 4 |
| T-17-1 | Store info configuration (name, address, hours, ready minutes) + footer and "Onde retirar" blocks | 2 |
| T-18-1 | `GET /orders/{code}` public view (first name only, readyAt) + integration tests | 3 |
| T-18-2 | Order page states: new (`?new=1`), reopened, not found | 2 |
| T-22-1 | `lastOrderStore` (localStorage) + "today" rule (America/Sao_Paulo) + unit tests (replaced in v1.4 by the active-orders store, E9-12) | 2 |
| T-22-2 | Home order cards: fetch, show/hide rules, stale-code removal (revised in v1.4 for several orders) | 3 |
| T-20-1 | Staff readability check of the order page (items, quantities, total) at 360 px | 2 |
| T-03-1 | Bestsellers filter + badge | 2 |
| T-10-1 | Cart refresh against current stock/price on load, with notices | 3 |
| T-14-1 | "Pagamento na loja" / "Total a pagar na loja" copy and a test that no payment UI exists | 2 |
| T-16-3 | ~~Copy-to-clipboard with fallback (order code)~~ removed 22 Oct 2026 | 2 |
| T-07-1 | Header cart badge with accessible label | 2 |

**Totals:** cross-cutting 33 h + stories 103 h = **136 h of conventional implementation and testing effort**, scheduled for 20 Oct – 3 Nov (Phases 4–5 in the overview).

> ⚠️ **Capacity risk:** 136 h in about two weeks is more than one person can normally deliver. The mitigation is to specify first, keep tasks small and verifiable, and track actual hours. If the work is behind on **29 Oct**, cut in this order: T-X-8 (E2E test) → US-07 → US-10 → US-03 → US-22.

---

## 11. Use cases

### 11.1 Screen identifiers

Use cases reference these screen IDs. Layout, states and pt-BR copy are specified in [`04-ui-design-system.md`](04-ui-design-system.md), and each screen has an approved reference in [`design/screens/`](design/screens/).

| ID | Screen | Route | Approved reference |
|---|---|---|---|
| SCR-01 | Catálogo (home: active-order cards, filter chips, product grid, footer) | `/` (`?filter=`) | `01-catalog`, `02-catalog-filtered`, `08-desktop-catalog` |
| SCR-02 | Carrinho | `/cart` | `03-cart` |
| SCR-03 | Finalizar pedido (checkout) | `/checkout` | `04-checkout`, `06-checkout-errors`, `09-desktop-checkout` |
| SCR-04 | Meu pedido (after placing the order and when reopened) | `/orders/{code}` | `05-my-order` |
| SCR-05 | Not found / generic error | n/a | `07-states` |

### 11.2 Use case diagram

[`diagrams/use-cases/use-case-diagram.svg`](diagrams/use-cases/use-case-diagram.svg) (source: `use-case-diagram.puml`)

| Actor | Description |
|---|---|
| Customer | Guest who buys cupcakes; no account |
| Store staff | Counter employee who verifies orders at pickup |
| Store owner | Stakeholder; their catalog-management use cases are **future** (out of scope) and shown greyed out |

### 11.3 Expanded use cases

Format follows the PIT I model: name, identifier, description, actors, pre- and post-conditions, main flow, alternative flows. Alternative flows are named by letter, and their steps are numbered by the main-flow step where they branch (e.g. `B7.1`).

---

#### UC-01 · Browse catalog

| | |
|---|---|
| **Identifier** | UC-01 |
| **Description** | The customer views the available cupcakes and narrows them down with filters. |
| **Actors** | Customer |
| **Stories** | US-01, US-02, US-03, US-04 |
| **Pre-conditions** | None (the store is online). |
| **Post-conditions** | The customer sees the active products that match the selected filter, with their stock state. |

**Main flow**
1. The use case starts when the customer opens the store (**SCR-01**).
2. The system retrieves the filters and the active products. <Alternative A>
3. The system displays the filter chips (All Cupcakes, Bestsellers, Classics, Chocolate, Fruity) with *All Cupcakes* selected, and one card per active product with image, name, description, price, bestseller badge if applicable, and stock state: available, low stock or sold out (**BR-03, BR-04**).
4. The customer selects a filter.
5. The system displays only the products that match the filter (**BR-03**) and records the filter in the URL. <Alternative B>
6. The use case ends when the customer adds a product to the cart (**UC-02**) or leaves the store.

**Alternative A: catalog can't be loaded**
- A2.1 The request fails (network or server error).
- A2.2 The system displays an error message with a "try again" action.
- A2.3 The customer chooses to try again; the use case returns to step 2.

**Alternative B: no products match the filter**
- B5.1 The system displays an empty-state message with an option to view all cupcakes.
- B5.2 The customer chooses to view all; the use case returns to step 3.

---

#### UC-02 · Manage cart

| | |
|---|---|
| **Identifier** | UC-02 |
| **Description** | The customer adds cupcakes in chosen quantities to the cart, reviews it, and edits quantities or removes items. |
| **Actors** | Customer |
| **Stories** | US-05, US-06, US-07, US-08, US-09, US-10 |
| **Pre-conditions** | The customer is viewing the catalog (UC-01). |
| **Post-conditions** | The browser cart contains valid lines (quantity 1 to min(stock, 20)), and totals reflect current prices. |

**Main flow**
1. The use case starts when the customer taps "+" on an available product card (**SCR-01**).
2. The system adds 1 unit to the browser cart, turns the button into a stepper showing the cart quantity, updates the cart badge and shows the toast "Adicionado ao carrinho" (**BR-17**).
3. The customer optionally changes the quantity with the card stepper.
4. The system limits the quantity to min(stock, 20) (**BR-05, BR-06**). <Alternative A> <Alternative B>
5. The customer opens the cart (**SCR-02**).
6. The system refreshes the cart's products from the server and shows each line (photo, name, current unit price, quantity, subtotal), the subtotal and the order total (**BR-07, BR-08**). <Alternative C> <Alternative D>
7. The customer changes a quantity, or removes a line and confirms the removal. <Alternative E>
8. The system updates the subtotals and total.
9. The customer chooses to continue; the use case ends and **UC-03** starts.

**Alternative A: quantity above the limit**
- A4.1 The "+" of the stepper is disabled at the limit and the system shows "Máximo disponível.".

**Alternative B: card stepper decreased below 1**
- B4.1 The system removes the product from the cart and the card shows the "+" button again.

**Alternative C: stock or availability changed**
- C6.1 For each line whose stock dropped below the cart quantity, the system reduces the quantity to the available stock.
- C6.2 For each line whose product is sold out or inactive, the system removes the line.
- C6.3 The system informs the customer which items changed; the use case continues at step 6.

**Alternative D: empty cart**
- D6.1 The system displays an empty-cart message and a link to the catalog; continuing to checkout is unavailable. The use case ends.

**Alternative E: removal cancelled**
- E7.1 The customer cancels the removal confirmation; the line is unchanged. The use case continues at step 7.

---

#### UC-03 · Place order

| | |
|---|---|
| **Identifier** | UC-03 |
| **Description** | The customer identifies themselves with name and phone (no account), reviews the order and places it. The system reserves stock and creates the order in one transaction. Payment happens later, at the store. |
| **Actors** | Customer |
| **Stories** | US-11, US-12, US-13, US-14, US-15, US-19 |
| **Includes** | UC-07 Validate and reserve stock |
| **Pre-conditions** | The cart has at least one line. |
| **Post-conditions** | Stock is decremented; a customer record exists (reused or created); an order exists with pickup status AWAITING_PICKUP, unit-price snapshots and a unique code; the browser cart is cleared and the code is stored among the active orders of the browser (BR-19); the customer is on SCR-04. |

**Main flow**
1. The use case starts when the customer continues from the cart.
2. The system displays **SCR-03** with the fields Nome and Celular, the pickup block (store address, ready time and "Pagamento na loja", **BR-12**) and the order summary with photos, quantities, unit prices, line subtotals, subtotal and total (**BR-09, BR-12**). <Alternative D>
3. The customer enters their name and phone number.
4. The system validates the fields (**BR-14**). <Alternative A>
5. The customer taps "Fazer pedido"; the system disables the button and shows "Enviando…".
6. The system sends the cart lines (product, quantity) and the customer data to the server.
7. The server re-validates the customer data (**BR-14**) <Alternative A> and checks that every product exists and is active <Alternative B>.
8. In one transaction, the server decrements stock for every line (**UC-07, BR-11**) <Alternative C>, upserts the customer by normalized phone (**BR-15**), computes line totals and the order total from database prices (**BR-07, BR-08**), generates a unique order code (**BR-13**), and creates the order (AWAITING_PICKUP) and its items (**BR-10**).
9. The system clears the browser cart (**BR-17**), stores the order code among the active orders (**BR-19**) and displays **SCR-04** with the "Pedido feito!" notice; the use case ends and **UC-05** applies. <Alternative E at steps 6–8>

**Alternative A: invalid customer data**
- A4.1 The system shows a message next to each invalid field. The order isn't created; the use case returns to step 3.

**Alternative B: product not found or inactive**
- B7.1 The server rejects the request with *product not found*. No order is created.
- B7.2 The system informs the customer and returns to the cart (UC-02, step 6), where the line is removed.

**Alternative C: insufficient stock**
- C8.1 The server rolls back the transaction with *insufficient stock*, listing each affected product and its available quantity. No order is created and no stock changes.
- C8.2 The system shows a notice ("Chocolate Crush: só 1 disponível.") with "Revisar", which returns the customer to the cart with quantities adjusted (UC-02, alternative C).

**Alternative D: empty cart**
- D2.1 The customer opens SCR-03 directly with an empty cart; the system redirects to the cart. The use case ends.

**Alternative E: network or server error**
- E.1 The system shows an error message with a retry action and re-enables the button; the cart is intact. The use case returns to step 5.

---

#### UC-04 · Reopen an active order

| | |
|---|---|
| **Identifier** | UC-04 |
| **Description** | The home page shows a compact card for each order (up to 5) placed in this browser that still awaits pickup; the customer taps one to reopen Meu pedido. |
| **Actors** | Customer |
| **Stories** | US-22 |
| **Includes** | UC-05 View order |
| **Pre-conditions** | The customer placed an order in this browser (BR-19). |
| **Post-conditions** | None (read-only). |

**Main flow**
1. The use case starts when the customer opens the home page (**SCR-01**).
2. The system reads the stored orders (code and creation time, up to 5) from the browser. <Alternative A>
3. The system retrieves each order by code. <Alternative B> <Alternative C>
4. For each order that is AWAITING_PICKUP, regardless of the day it was placed, the system shows the card "Seu pedido · code · Aguardando retirada" between the header and the filter chips. <Alternative A>
5. The customer taps a card; the system opens **SCR-04** for the code (**UC-05**). The use case ends.

**Alternative A: nothing to show**
- A.1 No stored order, or none with status AWAITING_PICKUP (PICKED_UP or EXPIRED are removed from the browser): no card is shown. The use case ends.

**Alternative B: stored code not found**
- B3.1 The system removes the stored code and doesn't show its card. The use case ends.

**Alternative C: network error**
- C3.1 The card isn't shown (the code is kept); the catalog keeps working. The use case ends.

---

#### UC-05 · View order

| | |
|---|---|
| **Identifier** | UC-05 |
| **Description** | Anyone with an order code opens Meu pedido and sees the order's contents and the amount to pay at the store, without personal data beyond the first name. |
| **Actors** | Customer (also performed by Store staff through UC-06) |
| **Stories** | US-16, US-17, US-18 |
| **Pre-conditions** | The actor has an order code or the order page URL. |
| **Post-conditions** | None (read-only). |

**Main flow**
1. The use case starts when the actor opens the order page for a code (**SCR-04**). This happens automatically after UC-03 (with the "new order" flag) and from UC-04.
2. The system retrieves the order by code. <Alternative A>
3. If the page was opened right after placing the order, the system shows the "Pedido feito!" notice with the ready time (BR-12). <Alternative B>
4. The system displays the order code centered with "Mostre este código no balcão", the customer's **first name only** (**BR-16**), the order time and the ready time (**BR-12**), the items (photo, quantity × unit price, line subtotal), the subtotal, "Total a pagar na loja" (**BR-09**), and "Onde retirar" with the store address, hours and the pickup deadline (**BR-18, BR-12**). If the order is EXPIRED or PICKED_UP, the system also shows the notice of US-18 AC4 (**BR-20, BR-21**).
5. The use case ends.

**Alternative A: order not found**
- A2.1 The system displays "Pedido não encontrado" (SCR-05) with "Voltar ao início". The use case ends.

**Alternative B: reopened order**
- B3.1 The success notice isn't shown; the use case continues at step 4.

---

#### UC-06 · Verify order and collect payment at pickup

| | |
|---|---|
| **Identifier** | UC-06 |
| **Description** | At the counter, staff use the order code to find the order, charge the total and hand over the items. |
| **Actors** | Store staff (primary), Customer |
| **Stories** | US-20 |
| **Includes** | UC-05 View order |
| **Pre-conditions** | The customer is at the store with an order code. |
| **Post-conditions** | The customer paid and received the order. The handover is recorded through the staff API (**BR-21**); recording payment is outside the product (**BR-18**). |

**Main flow**
1. The use case starts when the customer presents the order code (on Meu pedido or written down).
2. Staff open the order page for the code (**UC-05**). <Alternative A>
3. The system displays the order with its items, quantities and "Total a pagar na loja".
4. Staff gather the listed items and charge the total at the counter (**BR-09**).
5. The customer pays; staff hand over the cupcakes (offline actions).
6. The use case ends.

**Alternative A: code not found**
- A2.1 Staff re-check the typed code. If it's still not found, the order isn't handed over; staff may take a new order at the counter. The use case ends.

---

#### UC-07 · Validate and reserve stock (included)

| | |
|---|---|
| **Identifier** | UC-07 |
| **Description** | Server-side check-and-decrement of each requested quantity. Included by UC-03 inside the order-creation transaction. |
| **Actors** | n/a (included use case) |
| **Business rules** | BR-04, BR-05, BR-06, BR-11 |

**Main flow**
1. For each line, in a consistent product order, the system decrements the product's stock with a conditional update (`stock ≥ quantity`).
2. If every update affected one row, validation succeeds and the transaction continues.
3. If any update affected no row, validation fails with *insufficient stock*, listing every affected product with its requested and available quantities, and the transaction is rolled back.

### 11.4 Traceability

| Stories | Use case | Screens | Sequence diagram | Activity diagram |
|---|---|---|---|---|
| US-01–04 | UC-01 | SCR-01 | SD-01 | AD-01 |
| US-05–10 | UC-02 | SCR-01, SCR-02 | n/a (client-side; cart refresh reuses SD-01) | AD-01 |
| US-11–15, US-19 | UC-03 (+UC-07) | SCR-03 | SD-02 | AD-01 |
| US-22 | UC-04 (+UC-05) | SCR-01 | SD-03 | AD-02 |
| US-16–18 | UC-05 | SCR-04, SCR-05 | SD-04 | AD-01 |
| US-20 | UC-06 (+UC-05) | SCR-04 | SD-04 | AD-03 |
| US-24 | UC-06 | n/a (staff API) | SD-04 | AD-03 |
| US-25 | UC-07 | n/a (server) | SD-01…SD-04 | AD-01…AD-03 |
| US-21 | n/a (technical) | n/a | n/a | n/a |

## 12. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 10 Oct 2026 | Initial baseline from approved decisions D-01…D-14 (see overview §7) |
| 1.1 | 10 Oct 2026 | Phase 2: screen IDs, use case diagram, expanded use cases UC-01…UC-07, traceability to sequence and activity diagrams |
| 1.2 | 11 Oct 2026 | Approved UI (Phase 3): payment at the store replaces simulated Pix (BR-09…BR-12, NFR-12 rewritten); stock decremented at order creation; ready in ~15 min; new BR-19 (latest order in the browser); US-13/14/15/22 replaced, US-05/11/16–20 updated; T4/T5 regrouped (still 22 stories, 66 points); screens SCR-01…SCR-05 mapped to approved references; UC-03…UC-07 rewritten; backlog and tasks re-estimated (136 h) |
| 1.3 | 11 Oct 2026 | US-02 AC5: the filter chips stay visible while scrolling (owner request after testing the live app) |
| 1.4 | 18 Oct 2026 | User validation (E9-03, 5 testers): BR-12 rewritten (opening hours in the store configuration, orders accepted outside hours, `expiresAt`); BR-10, BR-11, BR-18 updated; BR-19 rewritten (up to 5 active orders, no "today" rule); new BR-20 (expiry and stock release) and BR-21 (staff pickup API); BR-06 cap guidance; §4 scope lines updated; US-06 AC5, US-13 AC4, US-16 AC1, US-17, US-18 AC4, US-22 rewritten; new US-23, US-24, US-25 (25 stories, 76 points) |
| 1.5 | 18 Oct 2026 | Documentation review: product name "Cupcake Store"; traceability rows for US-23, US-24, US-25; affinity map and UML diagrams redrawn for the current rules |
| 1.6 | 22 Oct 2026 | Owner decision (D-29): the order code block has no copy or share action. US-16 AC3 and US-23 removed (24 stories, 74 points); §3, §4, BR-19, UC-05 and traceability updated |
