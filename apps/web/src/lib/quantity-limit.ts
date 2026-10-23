import { MAX_LINE_QUANTITY } from "shared";

/**
 * Copy shown when a quantity cannot go higher (04-ui-design-system.md §9.1
 * `card.max`, `card.max.cap`, US-06). When the limit is the cap of 20 units per
 * product (BR-06) rather than the stock, the customer is pointed to the store
 * for larger orders (tester finding, E9-03).
 */
export const STOCK_LIMIT_MESSAGE = "Máximo disponível.";
export const CAP_LIMIT_MESSAGE = `Máximo de ${MAX_LINE_QUANTITY} unidades. Para encomendas maiores, fale com a loja.`;

/** Whether `maxQuantity` is the cap of 20 (so the stock holds at least as many units). */
export function isCapLimit(maxQuantity: number): boolean {
  return maxQuantity >= MAX_LINE_QUANTITY;
}

export function quantityLimitMessage(maxQuantity: number): string {
  return isCapLimit(maxQuantity) ? CAP_LIMIT_MESSAGE : STOCK_LIMIT_MESSAGE;
}
