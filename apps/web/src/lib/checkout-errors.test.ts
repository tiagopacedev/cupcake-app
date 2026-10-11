import { describe, expect, it } from "vitest";
import { interpretFailure } from "./checkout-errors";
import { NAME_ERROR, PHONE_ERROR } from "./checkout-validation";

const names: Record<string, string> = {
  crush: "Chocolate Crush",
  kiss: "Strawberry Kiss",
  cookies: "Cookies & Cream",
};
const nameOf = (id: string) => names[id] ?? "Um item";
const body = (code: string, details?: object) =>
  ({ error: { code, message: "x", requestId: "r", details } }) as never;

describe("US-12 AC4 server field errors", () => {
  it("shows the server's name and phone rejections next to their fields", () => {
    const failure = interpretFailure(
      400,
      body("VALIDATION_ERROR", {
        fields: [
          { path: "customer.name", message: "Name must have 2 to 80 characters" },
          { path: "customer.phone", message: "Invalid Brazilian mobile number" },
        ],
      }),
      nameOf,
    );
    expect(failure).toEqual({
      problem: null,
      fieldErrors: { name: NAME_ERROR, phone: PHONE_ERROR },
    });
  });

  it("falls back to the generic error when no field of the form is involved", () => {
    const failure = interpretFailure(
      400,
      body("VALIDATION_ERROR", { fields: [{ path: "items.0.quantity", message: "x" }] }),
      nameOf,
    );
    expect(failure.problem).toEqual({ kind: "network" });
    expect(failure.fieldErrors).toEqual({});
  });
});

describe("US-19 stock and product errors", () => {
  it("AC1: names the product and how many are available, and flags the summary line", () => {
    const failure = interpretFailure(
      409,
      body("INSUFFICIENT_STOCK", { items: [{ productId: "crush", requested: 2, available: 1 }] }),
      nameOf,
    );
    expect(failure.problem).toEqual({
      kind: "stock",
      message: "Chocolate Crush: só 1 disponível.",
      shortages: { crush: 1 },
    });
  });

  it("lists every short line, with the plural and the sold-out wording", () => {
    const failure = interpretFailure(
      409,
      body("INSUFFICIENT_STOCK", {
        items: [
          { productId: "cookies", requested: 4, available: 3 },
          { productId: "kiss", requested: 1, available: 0 },
        ],
      }),
      nameOf,
    );
    expect(failure.problem).toMatchObject({
      message: "Cookies & Cream: só 3 disponíveis. Strawberry Kiss esgotou.",
      shortages: { cookies: 3, kiss: 0 },
    });
  });

  it("AC3: tells which product is no longer available", () => {
    const failure = interpretFailure(
      409,
      body("PRODUCT_NOT_FOUND", { productIds: ["kiss", "unknown"] }),
      nameOf,
    );
    expect(failure.problem).toEqual({
      kind: "gone",
      message: "Strawberry Kiss não está mais disponível. Um item não está mais disponível.",
    });
  });
});

describe("rate limit and connection errors", () => {
  it("maps 429 to the approved copy", () => {
    expect(interpretFailure(429, body("RATE_LIMITED"), nameOf).problem).toEqual({
      kind: "rate",
      message: "Muitas tentativas. Tente de novo em instantes.",
    });
  });

  it.each([500, 502, 0])("maps status %i to the retryable connection error", (status) => {
    expect(interpretFailure(status, undefined, nameOf).problem).toEqual({ kind: "network" });
  });
});
