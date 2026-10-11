import { describe, expect, it } from "vitest";
import { maxQuantityOf, stockStateOf } from "../src/services/stock.service.js";

describe("BR-04 stock state (A-02)", () => {
  it.each([
    [0, "SOLD_OUT"],
    [1, "LOW"],
    [5, "LOW"],
    [6, "AVAILABLE"],
    [40, "AVAILABLE"],
  ] as const)("stock %i is %s", (stock, expected) => {
    expect(stockStateOf(stock)).toBe(expected);
  });
});

describe("BR-05/BR-06 max quantity = min(stock, 20)", () => {
  it.each([
    [0, 0],
    [1, 1],
    [3, 3],
    [20, 20],
    [21, 20],
    [35, 20],
  ])("stock %i allows up to %i", (stock, expected) => {
    expect(maxQuantityOf(stock)).toBe(expected);
  });
});
