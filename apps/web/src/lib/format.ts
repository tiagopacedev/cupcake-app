import { DISPLAY_TIME_ZONE } from "shared";

/**
 * Display formatting (04-ui-design-system.md §8.1, NFR-04). Money arrives as
 * integer cents and is only formatted here, in the UI.
 */
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const time = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DISPLAY_TIME_ZONE,
});

const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: DISPLAY_TIME_ZONE,
});

/** `1190` → `R$ 11,90` (the space is the non-breaking one Intl produces, as the copy deck requires). */
export function formatPrice(cents: number): string {
  return currency.format(cents / 100);
}

/** ISO instant → `HH:mm` (24 h) in America/Sao_Paulo. */
export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

/** ISO instant → `dd/mm` in America/Sao_Paulo. */
export function formatDayMonth(iso: string): string {
  return dayMonth.format(new Date(iso));
}

const dayKey = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: DISPLAY_TIME_ZONE,
});

/** Whether the instant falls on today's calendar date in America/Sao_Paulo. `now` is injectable for tests. */
export function isToday(iso: string, now: Date = new Date()): boolean {
  return dayKey.format(new Date(iso)) === dayKey.format(now);
}

/** Calendar days from `from` to `iso` in America/Sao_Paulo: 0 = same day, 1 = the next day, negative = earlier. */
function dayDifference(iso: string | Date, from: Date): number {
  const asUtcDay = (value: string | Date) => {
    const [year = 0, month = 1, day = 1] = dayKey.format(new Date(value)).split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((asUtcDay(iso) - asUtcDay(from)) / 86_400_000);
}

/** "às 10:15", "amanhã às 10:15" or "15/10 às 10:15": when something happens relative to `from`. */
function atTime(iso: string, from: Date): string {
  const days = dayDifference(iso, from);
  const clock = formatTime(iso);
  if (days === 0) return `às ${clock}`;
  if (days === 1) return `amanhã às ${clock}`;
  return `${formatDayMonth(iso)} às ${clock}`;
}

/**
 * Ready label of the checkout and the "Pedido feito!" notice (BR-12, 04 §8.4):
 * "Pronto em ~15 min" when the order is ready within the preparation time of
 * `from`, otherwise the time, with "amanhã" or the date when it is not today.
 * Without `readyMinutes` (store not loaded) only the time form is used.
 */
export function formatReadyLabel(readyAt: string, from: Date, readyMinutes?: number): string {
  if (
    readyMinutes !== undefined &&
    new Date(readyAt).getTime() - from.getTime() <= readyMinutes * 60_000
  ) {
    return `Pronto em ~${readyMinutes} min`;
  }
  return `Pronto ${atTime(readyAt, from)}`;
}

/** Ready part of the Meu pedido meta line (04 §6.11): "pronto às 14:50", "pronto amanhã às 10:15". */
export function formatReadyMeta(readyAt: string, createdAt: string): string {
  return `pronto ${atTime(readyAt, new Date(createdAt))}`;
}

/** "hoje, 19:00", "amanhã, 19:00" or "15/10, 19:00": until when the order can be collected (`pickup.deadline`). */
export function formatDeadline(expiresAt: string, now: Date): string {
  const days = dayDifference(expiresAt, now);
  const clock = formatTime(expiresAt);
  if (days === 0) return `hoje, ${clock}`;
  if (days === 1) return `amanhã, ${clock}`;
  return `${formatDayMonth(expiresAt)}, ${clock}`;
}
