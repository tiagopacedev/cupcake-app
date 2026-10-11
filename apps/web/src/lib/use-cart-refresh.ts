"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";
import { reconcileCart } from "@/lib/cart-reconcile";
import { useCartStore } from "@/lib/cart-store";

export type CartRefresh =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; products: Map<string, Product>; notices: string[] };

/**
 * Refreshes the cart against `GET /api/products` when a screen showing it
 * opens (US-10, BR-17): loads names, photos and current prices, reduces
 * quantities above the available stock and drops products that are sold out
 * or gone, reporting each change in `notices`. Waits for the persisted cart to
 * be loaded first, and skips the request for an empty cart.
 */
export function useCartRefresh(): CartRefresh {
  const hydrated = useCartStore((state) => state.hydrated);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CartRefresh>({ status: "loading" });

  useEffect(() => {
    if (!hydrated) return;
    const { lines, replaceLines } = useCartStore.getState();
    if (lines.length === 0) {
      setState({ status: "ready", products: new Map(), notices: [] });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    api
      .GET("/api/products", { cache: "no-store" })
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) throw new Error("No catalog data");
        const result = reconcileCart(useCartStore.getState().lines, data.products);
        if (result.changed) replaceLines(result.lines);
        setState({
          status: "ready",
          products: new Map(data.products.map((product) => [product.id, product])),
          notices: result.notices,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", retry: () => setAttempt((n) => n + 1) });
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, attempt]);

  return state;
}
