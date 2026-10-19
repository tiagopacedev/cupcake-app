import { describe, expect, it } from "vitest";
import { computePickup } from "./pickup-schedule.js";
import type { OpeningHours } from "./store.js";

// The seeded store: Tuesday to Sunday 10:00-19:00 (Monday closed), 15 min preparation.
const OPENING_HOURS: OpeningHours[] = [2, 3, 4, 5, 6, 0].map((weekday) => ({
  weekday,
  opensAt: "10:00",
  closesAt: "19:00",
}));
const store = { readyMinutes: 15, timeZone: "America/Sao_Paulo", openingHours: OPENING_HOURS };

/** America/Sao_Paulo is UTC-3 all year (no DST since 2019). */
const brt = (local: string) => new Date(`${local}:00-03:00`);

function pickupAt(local: string) {
  const { readyAt, expiresAt } = computePickup({ ...store, createdAt: brt(local) });
  const iso = (date: Date) => new Date(date.getTime() - 3 * 3_600_000).toISOString().slice(0, 16);
  return { readyAt: iso(readyAt), expiresAt: iso(expiresAt) };
}

// 2026-10-13 is a Tuesday; 2026-10-12 a Monday; 2026-10-18 a Sunday.
describe("BR-12 pickup schedule", () => {
  it("mid-day: ready 15 min after the order, expires at closing time", () => {
    expect(pickupAt("2026-10-13T14:20")).toEqual({
      readyAt: "2026-10-13T14:35",
      expiresAt: "2026-10-13T19:00",
    });
  });

  it("before opening: ready 15 min after opening", () => {
    expect(pickupAt("2026-10-13T08:00")).toEqual({
      readyAt: "2026-10-13T10:15",
      expiresAt: "2026-10-13T19:00",
    });
  });

  it("exactly at opening time", () => {
    expect(pickupAt("2026-10-13T10:00").readyAt).toBe("2026-10-13T10:15");
  });

  it("22:00 (tester finding): ready tomorrow at 10:15, expires tomorrow at 19:00", () => {
    expect(pickupAt("2026-10-13T22:00")).toEqual({
      readyAt: "2026-10-14T10:15",
      expiresAt: "2026-10-14T19:00",
    });
  });

  it("18:30 is the last order that is ready before the 15-minute pickup window at closing", () => {
    expect(pickupAt("2026-10-13T18:30")).toEqual({
      readyAt: "2026-10-13T18:45",
      expiresAt: "2026-10-13T19:00",
    });
  });

  it("18:31 would leave less than 15 minutes to collect: rolls to the next opening", () => {
    expect(pickupAt("2026-10-13T18:31").readyAt).toBe("2026-10-14T10:15");
  });

  it("after closing (19:20) rolls to the next opening", () => {
    expect(pickupAt("2026-10-13T19:20").readyAt).toBe("2026-10-14T10:15");
  });

  it("Monday is closed: an order on Monday is ready on Tuesday", () => {
    expect(pickupAt("2026-10-12T11:00")).toEqual({
      readyAt: "2026-10-13T10:15",
      expiresAt: "2026-10-13T19:00",
    });
  });

  it("Sunday evening skips closed Monday and is ready on Tuesday", () => {
    expect(pickupAt("2026-10-18T20:00").readyAt).toBe("2026-10-20T10:15");
  });

  it("uses the store's local date, not UTC: 22:30 local is already the next day in UTC", () => {
    // 2026-10-14T01:30Z is Tuesday 22:30 in Sao Paulo.
    const created = new Date("2026-10-14T01:30:00Z");
    const { readyAt } = computePickup({ ...store, createdAt: created });
    expect(readyAt.toISOString()).toBe("2026-10-14T13:15:00.000Z"); // Wednesday 10:15 local
  });

  it("works for a store in another time zone", () => {
    const { readyAt, expiresAt } = computePickup({
      readyMinutes: 30,
      timeZone: "America/New_York",
      openingHours: [{ weekday: 3, opensAt: "09:00", closesAt: "17:00" }],
      createdAt: new Date("2026-10-14T13:00:00Z"), // Wednesday 09:00 EDT
    });
    expect(readyAt.toISOString()).toBe("2026-10-14T13:30:00.000Z");
    expect(expiresAt.toISOString()).toBe("2026-10-14T21:00:00.000Z");
  });

  it("handles a UTC-offset change between the order and the next opening", () => {
    // US DST ends on 2026-11-01 (02:00 EDT -> 01:00 EST): Saturday evening order, Sunday window.
    const { readyAt, expiresAt } = computePickup({
      readyMinutes: 15,
      timeZone: "America/New_York",
      openingHours: [{ weekday: 0, opensAt: "10:00", closesAt: "18:00" }],
      createdAt: new Date("2026-11-01T00:30:00Z"), // Saturday 20:30 EDT
    });
    expect(readyAt.toISOString()).toBe("2026-11-01T15:15:00.000Z"); // 10:15 EST
    expect(expiresAt.toISOString()).toBe("2026-11-01T23:00:00.000Z"); // 18:00 EST
  });

  it("throws when the store has no opening hours", () => {
    expect(() =>
      computePickup({ ...store, openingHours: [], createdAt: brt("2026-10-13T12:00") }),
    ).toThrow(/no usable opening hours/i);
  });

  it("throws when no window is long enough for the preparation time", () => {
    expect(() =>
      computePickup({
        ...store,
        openingHours: [{ weekday: 2, opensAt: "10:00", closesAt: "10:20" }],
        createdAt: brt("2026-10-13T12:00"),
      }),
    ).toThrow(/no usable opening hours/i);
  });
});
