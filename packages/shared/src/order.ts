import { z } from "zod";
import { MAX_LINE_QUANTITY } from "./store.js";

/**
 * Order input rules shared by the API and the checkout form (BR-13, BR-14,
 * US-12; 07-api-spec.md §3.4). Messages are developer-facing English; the web
 * maps fields to the pt-BR copy of 04-ui-design-system.md §9.3/§9.5.
 */

/** Order code alphabet: digits 2-9 and letters without I, L, O (BR-13). 31 characters. */
export const ORDER_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ORDER_CODE_PATTERN = /^CUP-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

const MOBILE = /^[1-9]{2}9\d{8}$/;

/**
 * Normalizes a Brazilian mobile number to `+55DD9XXXXXXXX`, or returns `null`
 * when it is not one (BR-14). Accepts spaces, parentheses, hyphens and an
 * optional `+55` / `55` prefix. A bare 11-digit number that happens to start
 * with 55 is a DDD 55 number, not a country code: the prefix is only stripped
 * from 13 digits.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[\s()-]/g, "");
  if (digits.startsWith("+")) {
    if (!digits.startsWith("+55")) return null;
    digits = digits.slice(3);
  } else if (/^55\d{11}$/.test(digits)) {
    digits = digits.slice(2);
  }
  return MOBILE.test(digits) ? `+55${digits}` : null;
}

const NAME_MESSAGE = "Name must have 2 to 80 characters";
const QUANTITY_MESSAGE = "Quantity must be between 1 and 20";

const customerSchema = z.strictObject({
  name: z.string().trim().min(2, NAME_MESSAGE).max(80, NAME_MESSAGE),
  phone: z
    .string()
    .max(25, "Invalid Brazilian mobile number")
    .transform((value, ctx) => {
      const normalized = normalizePhone(value);
      if (normalized === null) {
        ctx.addIssue({ code: "custom", message: "Invalid Brazilian mobile number" });
        return z.NEVER;
      }
      return normalized;
    }),
});

const itemSchema = z.strictObject({
  productId: z.uuid(),
  quantity: z
    .number()
    .int(QUANTITY_MESSAGE)
    .min(1, QUANTITY_MESSAGE)
    .max(MAX_LINE_QUANTITY, QUANTITY_MESSAGE),
});

/** `POST /api/orders` body (docs/openapi.yaml `CreateOrderRequest`). Unknown fields, e.g. a client price, are rejected (BR-07). */
export const createOrderSchema = z.strictObject({
  customer: customerSchema,
  items: z
    .array(itemSchema)
    .min(1, "Items must not be empty")
    .max(50, "Items must have at most 50 lines")
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        if (seen.has(item.productId)) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate product",
            path: [index, "productId"],
          });
        }
        seen.add(item.productId);
      });
    }),
});

/** A validated order request: trimmed name, normalized phone. */
export type CreateOrderInput = z.output<typeof createOrderSchema>;
