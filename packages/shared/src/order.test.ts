import { describe, expect, it } from "vitest";
import {
  createOrderSchema,
  normalizePhone,
  ORDER_CODE_ALPHABET,
  ORDER_CODE_PATTERN,
} from "./order.js";

const PRODUCT_A = "3f6c1d2a-6a4e-4b8e-9a1f-2c3d4e5f6a7b";
const PRODUCT_B = "9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("BR-14 / US-12 AC3 phone normalization", () => {
  it.each([
    "(11) 91234-5678",
    "11912345678",
    "+55 11 91234-5678",
    "5511912345678",
    "+5511912345678",
    "  (11)91234 5678  ",
    "11 9 1234-5678",
  ])("normalizes %j to +5511912345678", (input) => {
    expect(normalizePhone(input)).toBe("+5511912345678");
  });

  it("keeps a DDD that starts with 55 instead of mistaking it for the country code", () => {
    expect(normalizePhone("55912345678")).toBe("+5555912345678");
    expect(normalizePhone("(55) 91234-5678")).toBe("+5555912345678");
  });

  it.each([
    ["landline", "1131234567"],
    ["landline with DDD formatting", "(11) 3123-4567"],
    ["8 digits only", "91234567"],
    ["DDD starting with 0", "01912345678"],
    ["not starting with 9 after the DDD", "11812345678"],
    ["too long", "119123456789"],
    ["letters", "11abcdefghi"],
    ["empty", ""],
    ["foreign country code", "+1 11 91234-5678"],
    ["plus in the middle", "11+912345678"],
  ])("rejects %s", (_label, input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("US-12 createOrderSchema", () => {
  const valid = {
    customer: { name: "Ana Souza", phone: "(11) 91234-5678" },
    items: [
      { productId: PRODUCT_A, quantity: 2 },
      { productId: PRODUCT_B, quantity: 1 },
    ],
  };

  it("accepts a valid order and returns the normalized phone and trimmed name", () => {
    const result = createOrderSchema.parse({
      ...valid,
      customer: { name: "  Ana Souza ", phone: "(11) 91234-5678" },
    });
    expect(result.customer).toEqual({ name: "Ana Souza", phone: "+5511912345678" });
    expect(result.items).toEqual(valid.items);
  });

  const issuesOf = (input: unknown) => {
    const result = createOrderSchema.safeParse(input);
    return result.success
      ? []
      : result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));
  };

  it("AC1: rejects an empty or one-character name, and a name over 80", () => {
    const message = "Name must have 2 to 80 characters";
    for (const name of ["", " ", "  A ", "A"]) {
      expect(issuesOf({ ...valid, customer: { ...valid.customer, name } })).toEqual([
        { path: "customer.name", message },
      ]);
    }
    expect(issuesOf({ ...valid, customer: { ...valid.customer, name: "A".repeat(81) } })).toEqual([
      { path: "customer.name", message },
    ]);
  });

  it("accepts names of exactly 2 and 80 characters", () => {
    for (const name of ["Jo", "A".repeat(80)]) {
      expect(issuesOf({ ...valid, customer: { ...valid.customer, name } })).toEqual([]);
    }
  });

  it("AC2: rejects an invalid phone with the format message", () => {
    expect(issuesOf({ ...valid, customer: { ...valid.customer, phone: "1131234567" } })).toEqual([
      { path: "customer.phone", message: "Invalid Brazilian mobile number" },
    ]);
  });

  it("rejects an empty item list", () => {
    expect(issuesOf({ ...valid, items: [] })).toEqual([
      { path: "items", message: "Items must not be empty" },
    ]);
  });

  it("rejects more than 50 lines", () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      productId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      quantity: 1,
    }));
    expect(issuesOf({ ...valid, items }).map((issue) => issue.path)).toEqual(["items"]);
  });

  it("rejects a duplicated product", () => {
    expect(
      issuesOf({
        ...valid,
        items: [
          { productId: PRODUCT_A, quantity: 1 },
          { productId: PRODUCT_A, quantity: 2 },
        ],
      }),
    ).toEqual([{ path: "items.1.productId", message: "Duplicate product" }]);
  });

  it.each([0, -1, 21, 1.5])("rejects quantity %s", (quantity) => {
    expect(issuesOf({ ...valid, items: [{ productId: PRODUCT_A, quantity }] })).toEqual([
      { path: "items.0.quantity", message: "Quantity must be between 1 and 20" },
    ]);
  });

  it("rejects a product id that is not a uuid", () => {
    expect(
      issuesOf({ ...valid, items: [{ productId: "nope", quantity: 1 }] }).map((i) => i.path),
    ).toEqual(["items.0.productId"]);
  });

  it("BR-07: rejects client-sent prices and other unknown fields", () => {
    expect(
      issuesOf({ ...valid, items: [{ productId: PRODUCT_A, quantity: 1, priceCents: 1 }] }),
    ).not.toEqual([]);
    expect(issuesOf({ ...valid, totalCents: 1 })).not.toEqual([]);
  });
});

describe("BR-13 order code format", () => {
  it("uses a 31-character alphabet without 0, O, 1, I and L", () => {
    expect(ORDER_CODE_ALPHABET).toHaveLength(31);
    expect(ORDER_CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it("matches CUP- plus six alphabet characters only", () => {
    expect(ORDER_CODE_PATTERN.test("CUP-7K3Q9F")).toBe(true);
    for (const bad of [
      "CUP-7K3Q9",
      "CUP-7K3Q9FF",
      "cup-7k3q9f",
      "CUP-0K3Q9F",
      "CUP-7K3QIF",
      "XYZ-7K3Q9F",
    ]) {
      expect(ORDER_CODE_PATTERN.test(bad)).toBe(false);
    }
  });
});
