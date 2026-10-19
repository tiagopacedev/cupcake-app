import { z } from "zod";
import { ORDER_CODE_PATTERN } from "shared";

/**
 * Active orders of this browser (BR-19, 04-ui-design-system.md §8.3). Only each
 * order's code and creation time are stored, newest first, up to
 * `MAX_STORED_ORDERS`, under `cupcake.orders`: no name, phone or items. This is
 * not a history: the home page drops an order as soon as the API says it is no
 * longer awaiting pickup. Every access is wrapped in try/catch; with storage
 * unavailable the app simply works without the cards.
 */
export const ORDERS_KEY = "cupcake.orders";
/** The single-order key of v1.0.0 (BR-19 before E9-03); moved into the list once, then removed. */
export const LEGACY_ORDER_KEY = "cupcake.lastOrder";
export const MAX_STORED_ORDERS = 5;

export interface StoredOrder {
  code: string;
  createdAt: string;
}

const storedOrder = z.object({
  code: z.string().regex(ORDER_CODE_PATTERN),
  createdAt: z.iso.datetime(),
});

/** Valid entries of a raw JSON value; anything else (corrupt data, wrong shape) is ignored. */
function parseList(raw: string | null): StoredOrder[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
      const parsed = storedOrder.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

function parseLegacy(raw: string | null): StoredOrder | null {
  if (raw === null) return null;
  try {
    const parsed = storedOrder.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function write(orders: StoredOrder[]): void {
  window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, MAX_STORED_ORDERS)));
}

/** The stored orders, newest first. A leftover `cupcake.lastOrder` is merged in (as the oldest) and removed. */
export function readOrders(): StoredOrder[] {
  try {
    const orders = parseList(window.localStorage.getItem(ORDERS_KEY));
    const legacyRaw = window.localStorage.getItem(LEGACY_ORDER_KEY);
    if (legacyRaw === null) return orders;

    const legacy = parseLegacy(legacyRaw);
    const merged =
      legacy && !orders.some((order) => order.code === legacy.code) ? [...orders, legacy] : orders;
    const kept = merged.slice(0, MAX_STORED_ORDERS);
    write(kept);
    window.localStorage.removeItem(LEGACY_ORDER_KEY);
    return kept;
  } catch {
    return [];
  }
}

/** Adds an order in front of the others; the oldest beyond `MAX_STORED_ORDERS` is dropped. */
export function saveOrder(order: StoredOrder): void {
  try {
    const others = readOrders().filter((existing) => existing.code !== order.code);
    write([order, ...others]);
  } catch {
    // Storage unavailable or full: nothing to do.
  }
}

/** Forgets one order (unknown to the server, picked up or expired). */
export function removeOrder(code: string): void {
  try {
    write(readOrders().filter((order) => order.code !== code));
  } catch {
    // See saveOrder.
  }
}
