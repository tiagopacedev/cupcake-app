import type { ProductQuery } from "@/lib/catalog";

/**
 * Catalog filter chips and how they map to the API (07-api-spec.md §3.2, US-02,
 * US-03). The chip row is fixed copy from the copy deck (04 §9.1), so it does
 * not need `GET /api/catalog/filters`.
 */
export type FilterKey = "bestsellers" | "classics" | "chocolate" | "fruity";

export const FILTER_CHIPS: { key: FilterKey | null; label: string }[] = [
  { key: null, label: "Todos" },
  { key: "bestsellers", label: "Mais vendidos" },
  { key: "classics", label: "Clássicos" },
  { key: "chocolate", label: "Chocolate" },
  { key: "fruity", label: "Frutados" },
];

const FILTER_KEYS: readonly string[] = FILTER_CHIPS.flatMap((chip) => (chip.key ? [chip.key] : []));

/** The `?filter=` value, or `null` (Todos) when it is missing or not one of the known keys. */
export function parseFilter(raw: string | string[] | undefined): FilterKey | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && FILTER_KEYS.includes(value) ? (value as FilterKey) : null;
}

/** `bestsellers` → `tag=bestseller`; a category chip → `category=<slug>`; none → no parameter. */
export function queryForFilter(filter: FilterKey | null): ProductQuery {
  if (filter === null) return {};
  if (filter === "bestsellers") return { tag: "bestseller" };
  return { category: filter };
}

/** URL of a chip: `/` for Todos, otherwise `/?filter=<key>`. */
export function hrefForFilter(filter: FilterKey | null): string {
  return filter === null ? "/" : `/?filter=${filter}`;
}
