import { LOW_STOCK_THRESHOLD, MAX_LINE_QUANTITY } from "shared";

export type StockState = "AVAILABLE" | "LOW" | "SOLD_OUT";

/** Display state of a product's stock: SOLD_OUT at 0, LOW at 1–5, else AVAILABLE (BR-04, A-02). */
export function stockStateOf(stockQuantity: number): StockState {
  if (stockQuantity <= 0) return "SOLD_OUT";
  if (stockQuantity <= LOW_STOCK_THRESHOLD) return "LOW";
  return "AVAILABLE";
}

/** Stepper limit of a line: min(stock, 20) (BR-05, BR-06). The server re-validates on order creation. */
export function maxQuantityOf(stockQuantity: number): number {
  return Math.max(0, Math.min(stockQuantity, MAX_LINE_QUANTITY));
}
