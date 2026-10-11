import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { z } from "zod";
import { MAX_LINE_QUANTITY } from "shared";

/**
 * Cart store (BR-17, 04-ui-design-system.md §8.2). Persisted in localStorage
 * under `cupcake.cart` as a plain `[{ productId, quantity }]` array and
 * nothing else (no prices or names: the cart is reconciled against the API
 * when shown, US-10). It never throws: corrupt or unavailable storage just
 * means an empty cart.
 *
 * Hydration is manual (`skipHydration`): the server render and the first
 * client render must both see an empty cart, or React reports a mismatch.
 * `CartHydrator` calls `rehydrate()` after mount; until `hydrated` is true,
 * components should not show cart-dependent UI.
 */
export const CART_STORAGE_KEY = "cupcake.cart";

export interface CartLine {
  productId: string;
  quantity: number;
}

const storedLines = z.array(
  z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) }),
);

interface CartState {
  lines: CartLine[];
  hydrated: boolean;
  /** Adds one unit (merging into an existing line), never above `max` (BR-05, BR-06). */
  add: (productId: string, max: number) => void;
  /** Sets a line's quantity, clamped to 1…max; use `remove` to take it out (US-09). */
  setQuantity: (productId: string, quantity: number, max: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const clamp = (quantity: number, max: number) =>
  Math.max(1, Math.min(quantity, max, MAX_LINE_QUANTITY));

const storage: PersistStorage<Pick<CartState, "lines">> = {
  getItem: (name) => {
    try {
      const raw = window.localStorage.getItem(name);
      if (raw === null) return null;
      const parsed = storedLines.safeParse(JSON.parse(raw));
      return parsed.success ? { state: { lines: parsed.data }, version: 0 } : null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, JSON.stringify(value.state.lines));
    } catch {
      // Storage unavailable or full: the cart still works for this session.
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // See setItem.
    }
  },
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      hydrated: false,
      add: (productId, max) =>
        set((state) => {
          if (max < 1) return state;
          const existing = state.lines.find((line) => line.productId === productId);
          if (!existing) return { lines: [...state.lines, { productId, quantity: 1 }] };
          return {
            lines: state.lines.map((line) =>
              line.productId === productId
                ? { ...line, quantity: clamp(line.quantity + 1, max) }
                : line,
            ),
          };
        }),
      setQuantity: (productId, quantity, max) =>
        set((state) => ({
          lines: state.lines.map((line) =>
            line.productId === productId ? { ...line, quantity: clamp(quantity, max) } : line,
          ),
        })),
      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((line) => line.productId !== productId) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: CART_STORAGE_KEY,
      storage,
      skipHydration: true,
      partialize: (state) => ({ lines: state.lines }),
      onRehydrateStorage: () => () => useCartStore.setState({ hydrated: true }),
    },
  ),
);

/** Total units in the cart, the header badge (US-07). */
export const selectTotalUnits = (state: Pick<CartState, "lines">): number =>
  state.lines.reduce((sum, line) => sum + line.quantity, 0);

/** Quantity of one product in the cart, 0 when absent. */
export const selectQuantity =
  (productId: string) =>
  (state: Pick<CartState, "lines">): number =>
    state.lines.find((line) => line.productId === productId)?.quantity ?? 0;
