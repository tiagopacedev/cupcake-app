# Approved UI reference (Phase 3)

The approved mockups of the Cupcake Store UI (approved on 11 Oct 2026). The specification that explains these files is [`../04-ui-design-system.md`](../04-ui-design-system.md).

| Folder | Content |
|---|---|
| `screenshots/` | 2× PNG of every screen (390 px mobile, 1280 px desktop). The visual target. |
| `screens/` | Standalone HTML of every screen with inline styles, local photos and working links between screens. Open `01-catalog.html` in a browser to click through. Exact values live here. |
| `theme/` | `globals.css`: the design system as a standard Tailwind CSS v4 + shadcn/ui theme (copy to `apps/web/src/app/globals.css`). `design-tokens.source.json` is the original token export, kept for traceability only; don't import it. |
| `assets/photos/` | The six product photos (512 × 512 JPG). Copy to `apps/web/public/images/products/`. |
| `assets/icons/` | Lucide SVG icons used by the screens (use `lucide-react` in code). |

| File | Screen |
|---|---|
| `01-catalog` | Catálogo (Todos) + order card |
| `02-catalog-filtered` | Catálogo filtrado (Chocolate), toast, stock limit |
| `03-cart` | Carrinho |
| `04-checkout` | Finalizar pedido |
| `05-my-order` | Meu pedido (just placed) |
| `06-checkout-errors` | Finalizar pedido with errors and "Enviando…" |
| `07-states` | Loading, failure, empty cart, remove item, no active order, order not found |
| `08-desktop-catalog` | Catálogo (desktop) |
| `09-desktop-checkout` | Finalizar pedido (desktop) |

These files are **references, not production code**: they contain sample data, fixed artboard sizes and pixel values. Rebuild them with shadcn/ui components and standard Tailwind utilities as described in `04-ui-design-system.md` §4–§6. Don't edit them by hand; if the design changes, export new references and bump the version of `04-ui-design-system.md`. Behavior added after approval (several order cards, share button, ready and expiry copy) is specified in that document, not in these mockups.
