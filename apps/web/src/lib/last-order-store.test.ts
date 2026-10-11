import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLastOrder,
  LAST_ORDER_KEY,
  readLastOrder,
  readTodaysLastOrder,
  saveLastOrder,
} from "./last-order-store";

const order = { code: "CUP-7K3Q9F", createdAt: "2026-10-11T17:35:00.000Z" };

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("BR-19 latest order store", () => {
  it("saves only the code and creation time under cupcake.lastOrder", () => {
    saveLastOrder(order);
    expect(JSON.parse(window.localStorage.getItem(LAST_ORDER_KEY) ?? "null")).toEqual(order);
  });

  it("a new order overwrites the previous one", () => {
    saveLastOrder(order);
    saveLastOrder({ code: "CUP-ABCDEF", createdAt: "2026-10-11T18:00:00.000Z" });
    expect(readLastOrder()?.code).toBe("CUP-ABCDEF");
  });

  it("reads back what was saved and clears it", () => {
    saveLastOrder(order);
    expect(readLastOrder()).toEqual(order);
    clearLastOrder();
    expect(readLastOrder()).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(readLastOrder()).toBeNull();
  });

  it("ignores corrupt JSON and invalid shapes", () => {
    for (const value of [
      "{not json",
      "[]",
      JSON.stringify({ code: "nope", createdAt: order.createdAt }),
      JSON.stringify({ code: order.code, createdAt: "yesterday" }),
      JSON.stringify({ code: order.code }),
    ]) {
      window.localStorage.setItem(LAST_ORDER_KEY, value);
      expect(readLastOrder()).toBeNull();
    }
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => saveLastOrder(order)).not.toThrow();
    expect(readLastOrder()).toBeNull();
    expect(() => clearLastOrder()).not.toThrow();
  });
});

describe("BR-19 'created today' rule (America/Sao_Paulo)", () => {
  it("returns the order when it was created today", () => {
    saveLastOrder(order);
    expect(readTodaysLastOrder(new Date("2026-10-11T22:00:00.000Z"))?.code).toBe("CUP-7K3Q9F");
  });

  it("returns null for an order from a previous day", () => {
    saveLastOrder(order);
    expect(readTodaysLastOrder(new Date("2026-10-12T15:00:00.000Z"))).toBeNull();
  });

  it("respects the Sao Paulo midnight, not UTC midnight", () => {
    // Created 23:30 on the 11th in Sao Paulo (02:30 UTC on the 12th).
    saveLastOrder({ code: "CUP-7K3Q9F", createdAt: "2026-10-12T02:30:00.000Z" });
    // 23:59 on the 11th: same day.
    expect(readTodaysLastOrder(new Date("2026-10-12T02:59:00.000Z"))).not.toBeNull();
    // 00:01 on the 12th (03:01 UTC): a new day.
    expect(readTodaysLastOrder(new Date("2026-10-12T03:01:00.000Z"))).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(readTodaysLastOrder()).toBeNull();
  });
});
