import { STORE } from "shared";

/**
 * Display formatting (04-ui-design-system.md §8.1, NFR-04). Money arrives as
 * integer cents and is only formatted here, in the UI.
 */
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const time = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: STORE.timeZone,
});

const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: STORE.timeZone,
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
