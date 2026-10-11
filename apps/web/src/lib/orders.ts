import { api } from "@/lib/api/client";
import type { Order } from "@/lib/api/types";

export type OrderResult =
  | { status: "ok"; order: Order }
  | { status: "notfound" }
  | { status: "error" };

/**
 * Server-side order lookup (`GET /api/orders/{code}`, US-18). Never cached
 * (the status can change). An unknown or malformed code is `notfound`; any
 * other failure is `error`, so the page can offer a retry.
 */
export async function fetchOrder(code: string): Promise<OrderResult> {
  try {
    const { data, response } = await api.GET("/api/orders/{code}", {
      params: { path: { code } },
      cache: "no-store",
    });
    if (data) return { status: "ok", order: data };
    return { status: response.status === 404 ? "notfound" : "error" };
  } catch {
    return { status: "error" };
  }
}
