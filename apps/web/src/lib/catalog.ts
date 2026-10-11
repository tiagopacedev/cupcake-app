import { api } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";

export interface ProductQuery {
  category?: string;
  tag?: string;
}

/**
 * Server-side catalog fetch (`GET /api/products`). Stock changes constantly,
 * so it is never cached (02-architecture.md §6.4). Returns `null` on any
 * failure so the page can render its own error state with the header kept.
 */
export async function fetchProducts(query: ProductQuery = {}): Promise<Product[] | null> {
  try {
    const { data } = await api.GET("/api/products", { params: { query }, cache: "no-store" });
    return data?.products ?? null;
  } catch {
    return null;
  }
}
