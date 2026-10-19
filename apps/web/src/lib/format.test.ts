import { describe, expect, it } from "vitest";
import {
  formatDayMonth,
  formatDeadline,
  formatPrice,
  formatReadyLabel,
  formatReadyMeta,
  formatTime,
  isToday,
} from "./format";

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

describe("'today' in America/Sao_Paulo", () => {
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

// 2026-10-13 is a Tuesday. Sao Paulo is UTC-3, so 17:35Z is 14:35.
const TUESDAY_14_35 = new Date("2026-10-13T17:35:00.000Z");

describe("BR-12 ready label (checkout and 'Pedido feito!' notice)", () => {
  it("says 'em ~15 min' when the order is ready within the preparation time", () => {
    expect(formatReadyLabel("2026-10-13T17:50:00.000Z", TUESDAY_14_35, 15)).toBe(
      "Pronto em ~15 min",
    );
  });

  it("uses the preparation time of the store, not a fixed 15", () => {
    expect(formatReadyLabel("2026-10-13T17:55:00.000Z", TUESDAY_14_35, 20)).toBe(
      "Pronto em ~20 min",
    );
  });

  it("says the time when the store is not open now but opens later today", () => {
    // Created 08:00, ready 10:15.
    const earlyMorning = new Date("2026-10-13T11:00:00.000Z");
    expect(formatReadyLabel("2026-10-13T13:15:00.000Z", earlyMorning, 15)).toBe("Pronto às 10:15");
  });

  it("says 'amanhã' for the next calendar day, even a few hours away", () => {
    const night = new Date("2026-10-14T01:00:00.000Z"); // Tuesday 22:00
    expect(formatReadyLabel("2026-10-14T13:15:00.000Z", night, 15)).toBe("Pronto amanhã às 10:15");
  });

  it("says the date when it is two or more days away (closed Monday after Sunday evening)", () => {
    const sundayNight = new Date("2026-10-19T01:00:00.000Z"); // Sunday 18 Oct, 22:00
    expect(formatReadyLabel("2026-10-20T13:15:00.000Z", sundayNight, 15)).toBe(
      "Pronto 20/10 às 10:15",
    );
  });

  it("uses the Sao Paulo calendar day, not UTC: 22:30 local is already the next day in UTC", () => {
    const created = new Date("2026-10-14T01:30:00.000Z"); // Tuesday 22:30
    expect(formatReadyLabel("2026-10-14T13:15:00.000Z", created, 15)).toBe(
      "Pronto amanhã às 10:15",
    );
  });

  it("without the preparation time only the time form is used", () => {
    expect(formatReadyLabel("2026-10-13T17:50:00.000Z", TUESDAY_14_35)).toBe("Pronto às 14:50");
  });
});

describe("BR-12 ready part of the Meu pedido meta line", () => {
  it("same day: 'pronto às HH:mm'", () => {
    expect(formatReadyMeta("2026-10-13T17:50:00.000Z", "2026-10-13T17:35:00.000Z")).toBe(
      "pronto às 14:50",
    );
  });

  it("order placed after closing: 'pronto amanhã às HH:mm'", () => {
    expect(formatReadyMeta("2026-10-14T13:15:00.000Z", "2026-10-14T01:00:00.000Z")).toBe(
      "pronto amanhã às 10:15",
    );
  });

  it("further away: 'pronto dd/mm às HH:mm'", () => {
    expect(formatReadyMeta("2026-10-20T13:15:00.000Z", "2026-10-19T01:00:00.000Z")).toBe(
      "pronto 20/10 às 10:15",
    );
  });
});

describe("BR-20 pickup deadline ('Retire até')", () => {
  const closing = "2026-10-13T22:00:00.000Z"; // Tuesday 19:00

  it("same day: 'hoje, 19:00'", () => {
    expect(formatDeadline(closing, TUESDAY_14_35)).toBe("hoje, 19:00");
  });

  it("the next day: 'amanhã, 19:00'", () => {
    expect(formatDeadline(closing, new Date("2026-10-12T18:00:00.000Z"))).toBe("amanhã, 19:00");
  });

  it("any other day: the date", () => {
    expect(formatDeadline(closing, new Date("2026-10-09T18:00:00.000Z"))).toBe("13/10, 19:00");
    expect(formatDeadline(closing, new Date("2026-10-14T18:00:00.000Z"))).toBe("13/10, 19:00");
  });
});
