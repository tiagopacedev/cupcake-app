import { describe, expect, it } from "vitest";
import { LOW_STOCK_THRESHOLD, MAX_LINE_QUANTITY, STORE } from "./store.js";

describe("02-architecture §6.3 store configuration", () => {
  it("exposes readyMinutes = 15 for BR-12", () => {
    expect(STORE.readyMinutes).toBe(15);
  });

  it("uses America/Sao_Paulo for BR-19 'today' rule", () => {
    expect(STORE.timeZone).toBe("America/Sao_Paulo");
  });

  it("has name, address and openingHours strings (A-03)", () => {
    expect(STORE.name.length).toBeGreaterThan(0);
    expect(STORE.address.length).toBeGreaterThan(0);
    expect(STORE.openingHours.length).toBeGreaterThan(0);
  });

  it("A-01/A-02: line cap 20, low-stock threshold 5", () => {
    expect(MAX_LINE_QUANTITY).toBe(20);
    expect(LOW_STOCK_THRESHOLD).toBe(5);
  });
});
