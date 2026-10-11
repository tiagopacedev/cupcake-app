/**
 * Single source of truth for store/business configuration (02-architecture.md §6.3, A-03).
 * The web app reads this for the footer, checkout and Meu pedido; the API reads
 * `readyMinutes` for BR-12. Replace these placeholder values when real data exists.
 */
export const STORE = {
  name: "Cupcake Store",
  address: "Rua das Flores, 123 · Centro · São Paulo, SP",
  openingHours: "Ter a dom, 10h às 19h",
  /** Minutes from order creation to "ready for pickup" (BR-12). */
  readyMinutes: 15,
  /** IANA time zone used for "today" (BR-19) and all displayed times. */
  timeZone: "America/Sao_Paulo",
} as const;

/** Maximum units a single order line may request (BR-06, A-01). The server re-validates. */
export const MAX_LINE_QUANTITY = 20;

/** Stock quantity at or below which a product shows as "low" (BR-04, A-02). */
export const LOW_STOCK_THRESHOLD = 5;
