import { describe, expect, it } from "vitest";
import {
  DISPLAY_TIME_ZONE,
  LOW_STOCK_THRESHOLD,
  MAX_LINE_QUANTITY,
  STORE,
  formatOpeningHours,
  type OpeningHours,
} from "./store.js";

const window = (weekday: number, opensAt = "10:00", closesAt = "19:00"): OpeningHours => ({
  weekday,
  opensAt,
  closesAt,
});

describe("02-architecture §6.3 store configuration (D-24, A-03)", () => {
  it("uses America/Sao_Paulo to display every date and time (NFR-04)", () => {
    expect(DISPLAY_TIME_ZONE).toBe("America/Sao_Paulo");
  });

  it("is the placeholder store with a 15-minute preparation time (BR-12)", () => {
    expect(STORE).toMatchObject({
      name: "Cupcake Store",
      address: "Rua das Flores, 123 · Centro · São Paulo, SP",
      timeZone: "America/Sao_Paulo",
      readyMinutes: 15,
    });
  });

  it("opens Tuesday to Sunday, 10:00-19:00, and is closed on Monday", () => {
    expect(STORE.openingHours.map((h) => h.weekday).sort()).toEqual([0, 2, 3, 4, 5, 6]);
    for (const hours of STORE.openingHours) {
      expect(hours).toMatchObject({ opensAt: "10:00", closesAt: "19:00" });
    }
    expect(formatOpeningHours(STORE.openingHours)).toBe("Ter a dom, 10h às 19h");
  });

  it("A-01/A-02: line cap 20, low-stock threshold 5", () => {
    expect(MAX_LINE_QUANTITY).toBe(20);
    expect(LOW_STOCK_THRESHOLD).toBe(5);
  });
});

describe("BR-12 formatOpeningHours (footer and Meu pedido text)", () => {
  it("groups Tuesday to Sunday into the A-03 text", () => {
    const seeded = [2, 3, 4, 5, 6, 0].map((weekday) => window(weekday));
    expect(formatOpeningHours(seeded)).toBe("Ter a dom, 10h às 19h");
  });

  it("does not depend on the order of the rows", () => {
    const shuffled = [0, 5, 2, 6, 3, 4].map((weekday) => window(weekday));
    expect(formatOpeningHours(shuffled)).toBe("Ter a dom, 10h às 19h");
  });

  it("writes minutes when they are not zero", () => {
    expect(formatOpeningHours([window(1, "09:30", "18:45")])).toBe("Seg, 9h30 às 18h45");
  });

  it("joins two consecutive days with 'e'", () => {
    expect(formatOpeningHours([window(6), window(0)])).toBe("Sáb e dom, 10h às 19h");
  });

  it("splits groups with different windows", () => {
    const hours = [
      window(1),
      window(2),
      window(3),
      window(6, "09:00", "14:00"),
      window(0, "09:00", "14:00"),
    ];
    expect(formatOpeningHours(hours)).toBe("Seg a qua, 10h às 19h · Sáb e dom, 9h às 14h");
  });

  it("does not merge days separated by a closed day", () => {
    expect(formatOpeningHours([window(1), window(3)])).toBe("Seg, 10h às 19h · Qua, 10h às 19h");
  });

  it("is empty when the store never opens", () => {
    expect(formatOpeningHours([])).toBe("");
  });
});
