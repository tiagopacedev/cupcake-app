import { z } from "zod";
import { ORDER_CODE_PATTERN } from "shared";
import { isToday } from "@/lib/format";

/**
 * Latest order of this browser (BR-19, 04-ui-design-system.md §8.3). Only the
 * code and creation time are stored, under `cupcake.lastOrder`, replacing any
 * previous value: no name, phone or items. Every access is wrapped in
 * try/catch; with storage unavailable the app simply works without the card.
 */
export const LAST_ORDER_KEY = "cupcake.lastOrder";

export interface LastOrder {
  code: string;
  createdAt: string;
}

const stored = z.object({
  code: z.string().regex(ORDER_CODE_PATTERN),
  createdAt: z.iso.datetime(),
});

export function saveLastOrder(order: LastOrder): void {
  try {
    window.localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    // Storage unavailable or full: nothing to do.
  }
}

/** The stored order, or `null` when missing, corrupt or storage is unavailable. */
export function readLastOrder(): LastOrder | null {
  try {
    const raw = window.localStorage.getItem(LAST_ORDER_KEY);
    if (raw === null) return null;
    const parsed = stored.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearLastOrder(): void {
  try {
    window.localStorage.removeItem(LAST_ORDER_KEY);
  } catch {
    // See saveLastOrder.
  }
}

/** The stored order only if it was created today in America/Sao_Paulo (BR-19). */
export function readTodaysLastOrder(now: Date = new Date()): LastOrder | null {
  const order = readLastOrder();
  return order && isToday(order.createdAt, now) ? order : null;
}
