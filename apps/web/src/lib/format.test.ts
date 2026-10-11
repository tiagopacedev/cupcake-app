import { describe, expect, it } from "vitest";
import { formatDayMonth, formatPrice, formatTime, isToday } from "./format";

describe("NFR-04 money format", () => {
  it.each([
    [1190, "R$ 11,90"],
    [990, "R$ 9,90"],
    [0, "R$ 0,00"],
    [3370, "R$ 33,70"],
    [123456, "R$ 1.234,56"],
  ])("%i cents is %s", (cents, expected) => {
    expect(formatPrice(cents)).toBe(expected);
  });
});

describe("NFR-04 times in America/Sao_Paulo (UTC-3, no DST)", () => {
  it("formats HH:mm in 24 h", () => {
    expect(formatTime("2026-10-11T17:35:00.000Z")).toBe("14:35");
    expect(formatTime("2026-10-11T03:05:00.000Z")).toBe("00:05");
  });

  it("uses the Sao Paulo calendar day around midnight UTC", () => {
    // 01:30 UTC on the 12th is still 22:30 on the 11th in Sao Paulo.
    expect(formatDayMonth("2026-10-12T01:30:00.000Z")).toBe("11/10");
    expect(formatDayMonth("2026-10-12T03:00:00.000Z")).toBe("12/10");
  });
});

describe("BR-19 'today' in America/Sao_Paulo", () => {
  const at = (iso: string) => new Date(iso);

  it("is true for the same Sao Paulo calendar day", () => {
    expect(isToday("2026-10-11T12:00:00.000Z", at("2026-10-11T20:00:00.000Z"))).toBe(true);
  });

  it("23:59 in Sao Paulo (02:59 UTC next day) is still the same day as 00:01 earlier", () => {
    // 2026-10-12T02:59Z = 23:59 on the 11th; 2026-10-11T03:01Z = 00:01 on the 11th.
    expect(isToday("2026-10-11T03:01:00.000Z", at("2026-10-12T02:59:00.000Z"))).toBe(true);
  });

  it("00:01 on the 12th in Sao Paulo (03:01 UTC) is a different day from 23:59 on the 11th", () => {
    expect(isToday("2026-10-12T02:59:00.000Z", at("2026-10-12T03:01:00.000Z"))).toBe(false);
  });

  it("is false for yesterday and tomorrow", () => {
    expect(isToday("2026-10-10T15:00:00.000Z", at("2026-10-11T15:00:00.000Z"))).toBe(false);
    expect(isToday("2026-10-12T15:00:00.000Z", at("2026-10-11T15:00:00.000Z"))).toBe(false);
  });
});
