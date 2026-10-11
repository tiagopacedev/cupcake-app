import { describe, expect, it } from "vitest";
import { formatDayMonth, formatPrice, formatTime } from "./format";

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
