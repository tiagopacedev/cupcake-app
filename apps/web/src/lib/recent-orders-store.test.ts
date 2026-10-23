import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LEGACY_ORDER_KEY,
  MAX_STORED_ORDERS,
  ORDERS_KEY,
  readOrders,
  removeOrder,
  saveOrder,
} from "./recent-orders-store";

const order = { code: "CUP-7K3Q9F", createdAt: "2026-10-11T17:35:00.000Z" };
const codeOf = (n: number) => `CUP-${"23456789ABCDEFGHJKMNPQRSTUVWXYZ"[n]}AAAAA`;
const orderN = (n: number) => ({ code: codeOf(n), createdAt: `2026-10-11T17:${10 + n}:00.000Z` });

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("BR-19 active orders store", () => {
  it("saves only the code and creation time under cupcake.orders", () => {
    saveOrder(order);
    expect(JSON.parse(window.localStorage.getItem(ORDERS_KEY) ?? "null")).toEqual([order]);
  });

  it("a new order goes in front; the earlier ones are kept (US-22 AC5)", () => {
    saveOrder(orderN(0));
    saveOrder(orderN(1));
    saveOrder(orderN(2));
    expect(readOrders().map((o) => o.code)).toEqual([codeOf(2), codeOf(1), codeOf(0)]);
  });

  it("keeps at most 5 orders and drops the oldest (US-22 AC7)", () => {
    for (let n = 0; n < 7; n += 1) saveOrder(orderN(n));
    const codes = readOrders().map((o) => o.code);
    expect(MAX_STORED_ORDERS).toBe(5);
    expect(codes).toEqual([6, 5, 4, 3, 2].map(codeOf));
  });

  it("saving the same code again does not duplicate it", () => {
    saveOrder(orderN(0));
    saveOrder(orderN(1));
    saveOrder(orderN(0));
    expect(readOrders().map((o) => o.code)).toEqual([codeOf(0), codeOf(1)]);
  });

  it("removes one order and keeps the others", () => {
    saveOrder(orderN(0));
    saveOrder(orderN(1));
    removeOrder(codeOf(0));
    expect(readOrders().map((o) => o.code)).toEqual([codeOf(1)]);
  });

  it("returns an empty list when nothing is stored", () => {
    expect(readOrders()).toEqual([]);
  });

  it("ignores corrupt JSON, other shapes and invalid entries, keeping the valid ones", () => {
    for (const value of ["{not json", "{}", "null", '"x"']) {
      window.localStorage.setItem(ORDERS_KEY, value);
      expect(readOrders()).toEqual([]);
    }
    window.localStorage.setItem(
      ORDERS_KEY,
      JSON.stringify([
        { code: "nope", createdAt: order.createdAt },
        { code: order.code, createdAt: "yesterday" },
        { code: order.code },
        order,
      ]),
    );
    expect(readOrders()).toEqual([order]);
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => saveOrder(order)).not.toThrow();
    expect(readOrders()).toEqual([]);
    expect(() => removeOrder(order.code)).not.toThrow();
  });
});

describe("BR-19 migration of the v1.0.0 single-order key", () => {
  const legacy = { code: "CUP-ABCDEF", createdAt: "2026-10-10T12:00:00.000Z" };

  it("moves cupcake.lastOrder into the list (as the oldest) and removes the old key", () => {
    window.localStorage.setItem(LEGACY_ORDER_KEY, JSON.stringify(legacy));
    saveOrder(order);
    expect(readOrders().map((o) => o.code)).toEqual([order.code, legacy.code]);
    expect(window.localStorage.getItem(LEGACY_ORDER_KEY)).toBeNull();
  });

  it("migrates on read when nothing new was saved yet", () => {
    window.localStorage.setItem(LEGACY_ORDER_KEY, JSON.stringify(legacy));
    expect(readOrders()).toEqual([legacy]);
    expect(JSON.parse(window.localStorage.getItem(ORDERS_KEY) ?? "null")).toEqual([legacy]);
    expect(window.localStorage.getItem(LEGACY_ORDER_KEY)).toBeNull();
  });

  it("does not duplicate an order that is in both keys", () => {
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify([legacy]));
    window.localStorage.setItem(LEGACY_ORDER_KEY, JSON.stringify(legacy));
    expect(readOrders()).toEqual([legacy]);
  });

  it("drops a corrupt legacy value without failing", () => {
    window.localStorage.setItem(LEGACY_ORDER_KEY, "{not json");
    expect(readOrders()).toEqual([]);
    expect(window.localStorage.getItem(LEGACY_ORDER_KEY)).toBeNull();
  });

  it("respects the cap of 5 when merging", () => {
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify([0, 1, 2, 3, 4].map((n) => orderN(n))));
    window.localStorage.setItem(LEGACY_ORDER_KEY, JSON.stringify(legacy));
    expect(readOrders()).toHaveLength(5);
    expect(readOrders().some((o) => o.code === legacy.code)).toBe(false);
  });
});
