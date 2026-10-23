import type { OpeningHours } from "./store.js";

/**
 * Pickup schedule of an order (BR-12, D-24). One pure function used by the API
 * (authoritative value, from the database rows, stored on the order) and by the
 * checkout (instant preview, from the cached store).
 */

const MINUTE_MS = 60_000;
const DAYS_TO_SEARCH = 8;

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  minutesOfDay: number;
}

function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    minutesOfDay: value("hour") * 60 + value("minute"),
  };
}

/** Offset of `timeZone` from UTC at `instant`, in ms (positive east of Greenwich). */
function offsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, 0, p.minutesOfDay);
  return asUtc - Math.floor(instant.getTime() / MINUTE_MS) * MINUTE_MS;
}

/** The instant at which the wall clock of `timeZone` shows the given date and time. */
function wallClockToInstant(
  year: number,
  month: number,
  day: number,
  hhmm: string,
  timeZone: string,
): Date {
  const [hours = "0", minutes = "0"] = hhmm.split(":");
  const naive = Date.UTC(year, month - 1, day, Number(hours), Number(minutes));
  // Two passes settle on the right offset around a UTC-offset change.
  let instant = new Date(naive - offsetMs(new Date(naive), timeZone));
  instant = new Date(naive - offsetMs(instant, timeZone));
  return instant;
}

export interface PickupInput {
  createdAt: Date;
  readyMinutes: number;
  timeZone: string;
  openingHours: readonly OpeningHours[];
}

export interface PickupSchedule {
  /** First moment the order can be collected. */
  readyAt: Date;
  /** Closing time of the pickup day: an order not collected by then expires (BR-20). */
  expiresAt: Date;
}

/**
 * `readyAt` is the first moment at least `readyMinutes` after the order, within
 * opening hours, that still leaves the customer `readyMinutes` before closing
 * (`readyAt <= closesAt - readyMinutes`). An order placed while the store is
 * closed, or too close to closing, is ready after the next opening; closed
 * weekdays are skipped. `expiresAt` is the closing time of that day.
 */
export function computePickup(input: PickupInput): PickupSchedule {
  const { createdAt, readyMinutes, timeZone, openingHours } = input;
  const prepMs = readyMinutes * MINUTE_MS;
  const byWeekday = new Map(openingHours.map((entry) => [entry.weekday, entry]));
  const start = zonedParts(createdAt, timeZone);

  for (let offset = 0; offset < DAYS_TO_SEARCH; offset += 1) {
    // Calendar arithmetic on the local date: UTC is only used to normalize it.
    const calendar = new Date(Date.UTC(start.year, start.month - 1, start.day + offset));
    const hours = byWeekday.get(calendar.getUTCDay());
    if (!hours) continue;

    const year = calendar.getUTCFullYear();
    const month = calendar.getUTCMonth() + 1;
    const day = calendar.getUTCDate();
    const opensAt = wallClockToInstant(year, month, day, hours.opensAt, timeZone);
    const closesAt = wallClockToInstant(year, month, day, hours.closesAt, timeZone);

    const readyAt = new Date(Math.max(createdAt.getTime(), opensAt.getTime()) + prepMs);
    if (readyAt.getTime() <= closesAt.getTime() - prepMs) {
      return { readyAt, expiresAt: closesAt };
    }
  }
  throw new Error("No pickup time found: the store has no usable opening hours in the next days.");
}
