import type { components } from "@/lib/api/schema";
import { fieldForPath, NAME_ERROR, PHONE_ERROR } from "@/lib/checkout-validation";

type ErrorResponse = components["schemas"]["ErrorResponse"];

/** What went wrong when placing the order, in terms the checkout can show (04-ui-design-system.md §9.5). */
export type CheckoutProblem =
  | { kind: "stock"; message: string; shortages: Record<string, number> }
  | { kind: "gone"; message: string }
  | { kind: "rate"; message: string }
  | { kind: "network" };

export interface CheckoutFailure {
  problem: CheckoutProblem | null;
  fieldErrors: { name?: string; phone?: string };
}

const only = (available: number) =>
  available === 1 ? "só 1 disponível" : `só ${available} disponíveis`;

/**
 * Maps a failed `POST /api/orders` to field errors (US-12 AC4) or a notice:
 * `INSUFFICIENT_STOCK` → "{nome}: só N disponível." plus the shortages for the
 * red summary lines (US-19 AC1); `PRODUCT_NOT_FOUND` → "{nome} não está mais
 * disponível." (US-19 AC3); `RATE_LIMITED`; anything else → the generic
 * connection error with retry (US-15 AC3). `nameOf` resolves a product id to
 * its display name.
 */
export function interpretFailure(
  status: number,
  body: ErrorResponse | undefined,
  nameOf: (productId: string) => string,
): CheckoutFailure {
  const error = body?.error;

  if (status === 400 && error?.code === "VALIDATION_ERROR") {
    const fieldErrors: CheckoutFailure["fieldErrors"] = {};
    for (const field of error.details?.fields ?? []) {
      const target = fieldForPath(field.path);
      if (target === "name") fieldErrors.name = NAME_ERROR;
      if (target === "phone") fieldErrors.phone = PHONE_ERROR;
    }
    return Object.keys(fieldErrors).length > 0
      ? { problem: null, fieldErrors }
      : { problem: { kind: "network" }, fieldErrors: {} };
  }

  if (status === 409 && error?.code === "INSUFFICIENT_STOCK") {
    const items = error.details?.items ?? [];
    return {
      fieldErrors: {},
      problem: {
        kind: "stock",
        shortages: Object.fromEntries(items.map((item) => [item.productId, item.available])),
        message: items
          .map((item) =>
            item.available === 0
              ? `${nameOf(item.productId)} esgotou.`
              : `${nameOf(item.productId)}: ${only(item.available)}.`,
          )
          .join(" "),
      },
    };
  }

  if (status === 409 && error?.code === "PRODUCT_NOT_FOUND") {
    return {
      fieldErrors: {},
      problem: {
        kind: "gone",
        message: (error.details?.productIds ?? [])
          .map((id) => `${nameOf(id)} não está mais disponível.`)
          .join(" "),
      },
    };
  }

  if (status === 429) {
    return {
      fieldErrors: {},
      problem: { kind: "rate", message: "Muitas tentativas. Tente de novo em instantes." },
    };
  }

  return { problem: { kind: "network" }, fieldErrors: {} };
}
