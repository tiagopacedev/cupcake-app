import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CART_STORAGE_KEY, selectQuantity, selectTotalUnits, useCartStore } from "./cart-store";

const reset = () => useCartStore.setState({ lines: [], hydrated: false });
const stored = () => window.localStorage.getItem(CART_STORAGE_KEY);

beforeEach(() => {
  window.localStorage.clear();
  reset();
});
afterEach(() => vi.restoreAllMocks());

describe("BR-17 / US-05 add and merge", () => {
  it("adds a new product with quantity 1", () => {
    useCartStore.getState().add("a", 10);
    expect(useCartStore.getState().lines).toEqual([{ productId: "a", quantity: 1 }]);
  });

  it("merges into the existing line instead of duplicating it", () => {
    const { add } = useCartStore.getState();
    add("a", 10);
    add("a", 10);
    add("b", 10);
    expect(useCartStore.getState().lines).toEqual([
      { productId: "a", quantity: 2 },
      { productId: "b", quantity: 1 },
    ]);
  });

  it("never exceeds the stock limit (US-06 AC1, AC2)", () => {
    const { add } = useCartStore.getState();
    for (let i = 0; i < 6; i += 1) add("a", 4);
    expect(selectQuantity("a")(useCartStore.getState())).toBe(4);
  });

  it("never exceeds 20 per line even if the caller passes a bigger limit (US-06 AC3)", () => {
    const { add } = useCartStore.getState();
    for (let i = 0; i < 25; i += 1) add("a", 99);
    expect(selectQuantity("a")(useCartStore.getState())).toBe(20);
  });

  it("ignores adding a product with nothing available (BR-04)", () => {
    useCartStore.getState().add("a", 0);
    expect(useCartStore.getState().lines).toEqual([]);
  });
});

describe("US-09 set quantity, remove, clear", () => {
  it("sets a quantity within 1…max and clamps the rest", () => {
    const { add, setQuantity } = useCartStore.getState();
    add("a", 5);
    setQuantity("a", 3, 5);
    expect(selectQuantity("a")(useCartStore.getState())).toBe(3);
    setQuantity("a", 9, 5);
    expect(selectQuantity("a")(useCartStore.getState())).toBe(5);
    setQuantity("a", 0, 5);
    expect(selectQuantity("a")(useCartStore.getState())).toBe(1);
  });

  it("does not create a line when setting the quantity of an unknown product", () => {
    useCartStore.getState().setQuantity("ghost", 2, 5);
    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("removes one line and clears the cart (BR-17)", () => {
    const { add, remove, clear } = useCartStore.getState();
    add("a", 5);
    add("b", 5);
    remove("a");
    expect(useCartStore.getState().lines).toEqual([{ productId: "b", quantity: 1 }]);
    clear();
    expect(useCartStore.getState().lines).toEqual([]);
  });
});

describe("US-07 total units", () => {
  it("counts units, not distinct products", () => {
    const { add } = useCartStore.getState();
    add("a", 9);
    add("a", 9);
    add("b", 9);
    add("b", 9);
    add("b", 9);
    expect(selectTotalUnits(useCartStore.getState())).toBe(5);
  });

  it("is 0 for an empty cart", () => {
    expect(selectTotalUnits(useCartStore.getState())).toBe(0);
  });
});

describe("US-10 AC1 / BR-17 persistence", () => {
  it("stores only [{ productId, quantity }] under cupcake.cart", () => {
    const { add } = useCartStore.getState();
    add("a", 5);
    add("a", 5);
    expect(JSON.parse(stored() ?? "null")).toEqual([{ productId: "a", quantity: 2 }]);
  });

  it("restores the cart on rehydrate and marks the store hydrated", async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ productId: "a", quantity: 3 }]),
    );
    expect(useCartStore.getState().hydrated).toBe(false);
    await useCartStore.persist.rehydrate();
    expect(useCartStore.getState().lines).toEqual([{ productId: "a", quantity: 3 }]);
    expect(useCartStore.getState().hydrated).toBe(true);
  });

  it("starts empty but hydrated when nothing is stored", async () => {
    await useCartStore.persist.rehydrate();
    expect(useCartStore.getState().lines).toEqual([]);
    expect(useCartStore.getState().hydrated).toBe(true);
  });

  it("ignores corrupt JSON", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "{not json");
    await useCartStore.persist.rehydrate();
    expect(useCartStore.getState().lines).toEqual([]);
    expect(useCartStore.getState().hydrated).toBe(true);
  });

  it.each([
    ["wrong shape", { productId: "a", quantity: 1 }],
    ["fractional quantity", [{ productId: "a", quantity: 1.5 }]],
    ["zero quantity", [{ productId: "a", quantity: 0 }]],
    ["missing id", [{ quantity: 2 }]],
  ])("ignores a stored cart with %s", async (_label, value) => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(value));
    await useCartStore.persist.rehydrate();
    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("keeps working when storage throws (private mode, disabled storage)", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    await expect(useCartStore.persist.rehydrate()).resolves.not.toThrow();
    expect(() => useCartStore.getState().add("a", 5)).not.toThrow();
    expect(selectQuantity("a")(useCartStore.getState())).toBe(1);
  });

  it("persists an empty list after the cart is cleared", () => {
    useCartStore.getState().add("a", 5);
    useCartStore.getState().clear();
    expect(JSON.parse(stored() ?? "null")).toEqual([]);
  });
});
