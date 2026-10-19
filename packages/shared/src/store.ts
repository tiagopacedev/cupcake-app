/**
 * Store configuration, the single place for the store's data (02-architecture.md
 * §6.3, D-24, A-03). The web reads it for the header, footer, checkout and Meu
 * pedido; the API computes each order's pickup schedule from it (BR-12). There
 * is no admin panel, so changing the hours means editing this file and
 * deploying. Database tables for the hours were considered and deferred until
 * an admin screen exists.
 */

/** IANA time zone every displayed date and time uses (NFR-04). */
export const DISPLAY_TIME_ZONE = "America/Sao_Paulo";

/** Maximum units a single order line may request (BR-06, A-01). The server re-validates. */
export const MAX_LINE_QUANTITY = 20;

/** Stock quantity at or below which a product shows as "low" (BR-04, A-02). */
export const LOW_STOCK_THRESHOLD = 5;

/**
 * One opening window. `weekday` 0 = Sunday … 6 = Saturday; `opensAt` and
 * `closesAt` are "HH:mm" wall-clock times in the store's time zone. A weekday
 * without an entry is a closed day.
 */
export interface OpeningHours {
  weekday: number;
  opensAt: string;
  closesAt: string;
}

/** The store: who it is, where, its time zone, preparation time and weekly hours. */
export interface StoreInfo {
  name: string;
  address: string;
  timeZone: string;
  /** Minutes from the order to "ready for pickup" (BR-12). */
  readyMinutes: number;
  openingHours: readonly OpeningHours[];
}

/** The store (placeholders of A-03): open Tuesday to Sunday, 10:00–19:00; closed on Monday. */
export const STORE: StoreInfo = {
  name: "Cupcake Store",
  address: "Rua das Flores, 123 · Centro · São Paulo, SP",
  timeZone: DISPLAY_TIME_ZONE,
  readyMinutes: 15,
  openingHours: [2, 3, 4, 5, 6, 0].map((weekday) => ({
    weekday,
    opensAt: "10:00",
    closesAt: "19:00",
  })),
};

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
/** Monday first, the way opening hours are written in Brazil. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "10:00" → "10h", "10:30" → "10h30". */
function hourLabel(hhmm: string): string {
  const [hours = "", minutes = "00"] = hhmm.split(":");
  const h = String(Number(hours));
  return minutes === "00" ? `${h}h` : `${h}h${minutes}`;
}

function dayLabel(weekday: number | undefined): string {
  return (weekday === undefined ? undefined : DAY_LABELS[weekday]) ?? "";
}

function dayRangeLabel(run: number[]): string {
  const first = dayLabel(run[0]);
  if (run.length === 1) return first;
  const last = dayLabel(run[run.length - 1]).toLowerCase();
  return run.length === 2 ? `${first} e ${last}` : `${first} a ${last}`;
}

/**
 * Opening hours as the short pt-BR text of the footer and Meu pedido
 * (04-ui-design-system.md §6.10): consecutive days with the same window are
 * grouped, e.g. Tuesday to Sunday 10:00–19:00 → "Ter a dom, 10h às 19h".
 */
export function formatOpeningHours(hours: readonly OpeningHours[]): string {
  const byWeekday = new Map(hours.map((entry) => [entry.weekday, entry]));
  const groups: { run: number[]; window: string }[] = [];
  for (const weekday of WEEK_ORDER) {
    const entry = byWeekday.get(weekday);
    if (!entry) continue;
    const window = `${hourLabel(entry.opensAt)} às ${hourLabel(entry.closesAt)}`;
    const previous = groups[groups.length - 1];
    const previousDay = previous?.run[previous.run.length - 1];
    const consecutive =
      previousDay !== undefined &&
      WEEK_ORDER.indexOf(previousDay) + 1 === WEEK_ORDER.indexOf(weekday);
    if (previous && previous.window === window && consecutive) previous.run.push(weekday);
    else groups.push({ run: [weekday], window });
  }
  return groups.map(({ run, window }) => `${dayRangeLabel(run)}, ${window}`).join(" · ");
}
