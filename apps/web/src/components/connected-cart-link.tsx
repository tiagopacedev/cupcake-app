"use client";

import { CartLink } from "@/components/cart-link";
import { selectTotalUnits, useCartStore } from "@/lib/cart-store";

/** Header cart button fed by the cart store: total units, hidden at 0 (US-07). */
export function ConnectedCartLink() {
  const count = useCartStore(selectTotalUnits);
  return <CartLink count={count} />;
}
