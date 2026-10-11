"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/cart-store";

/** Loads the persisted cart after mount (see the hydration note in `lib/cart-store.ts`). Renders nothing. */
export function CartHydrator() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);
  return null;
}
