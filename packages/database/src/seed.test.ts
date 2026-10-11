import { describe, expect, it } from "vitest";
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_TAG } from "./seed-catalog.js";

/**
 * Unit-level, no database: validates the seed catalog constants themselves
 * against docs/03-data-model.md §8 — a pure data shape, same level as
 * 05-testing-strategy.md §2 "Unit" row. Session note: this would have
 * caught a real mistake made while authoring `seed.ts` (wrong names,
 * prices, stock and descriptions copied in before this test existed).
 */
describe("E2-03 seed catalog data (03-data-model.md §8)", () => {
  it("has exactly the 3 documented categories, in display order", () => {
    expect(SEED_CATEGORIES).toEqual([
      { name: "Clássicos", slug: "classics", sortOrder: 1 },
      { name: "Chocolate", slug: "chocolate", sortOrder: 2 },
      { name: "Frutados", slug: "fruity", sortOrder: 3 },
    ]);
  });

  it("has exactly the 1 documented tag", () => {
    expect(SEED_TAG).toEqual({ name: "Mais vendido", slug: "bestseller" });
  });

  it("has exactly the 6 documented products, in catalog display order", () => {
    expect(SEED_PRODUCTS.map((p) => p.slug)).toEqual([
      "birthday-vanilla",
      "red-velvet-classic",
      "chocolate-crush",
      "cookies-and-cream",
      "strawberry-kiss",
      "lemon-cream",
    ]);
  });

  it("matches the documented name, category, price and bestseller flag per product", () => {
    const bySlug = Object.fromEntries(SEED_PRODUCTS.map((p) => [p.slug, p]));

    expect(bySlug["birthday-vanilla"]).toMatchObject({
      name: "Birthday Vanilla",
      categorySlug: "classics",
      bestseller: true,
      priceCents: 990,
    });
    expect(bySlug["red-velvet-classic"]).toMatchObject({
      name: "Red Velvet Classic",
      categorySlug: "classics",
      bestseller: false,
      priceCents: 1290,
    });
    expect(bySlug["chocolate-crush"]).toMatchObject({
      name: "Chocolate Crush",
      categorySlug: "chocolate",
      bestseller: true,
      priceCents: 1190,
    });
    expect(bySlug["cookies-and-cream"]).toMatchObject({
      name: "Cookies & Cream",
      categorySlug: "chocolate",
      bestseller: false,
      priceCents: 1290,
    });
    expect(bySlug["strawberry-kiss"]).toMatchObject({
      name: "Strawberry Kiss",
      categorySlug: "fruity",
      bestseller: true,
      priceCents: 1190,
    });
    expect(bySlug["lemon-cream"]).toMatchObject({
      name: "Lemon Cream",
      categorySlug: "fruity",
      bestseller: false,
      priceCents: 1190,
    });
  });

  it("has exactly one bestseller per category", () => {
    const bestsellersByCategory = new Map<string, number>();
    for (const product of SEED_PRODUCTS) {
      if (!product.bestseller) continue;
      bestsellersByCategory.set(
        product.categorySlug,
        (bestsellersByCategory.get(product.categorySlug) ?? 0) + 1,
      );
    }
    expect(bestsellersByCategory.size).toBe(3);
    for (const count of bestsellersByCategory.values()) {
      expect(count).toBe(1);
    }
  });

  it("has the required low-stock (1–5) and sold-out (0) products (BR-04 UI states)", () => {
    const lowStock = SEED_PRODUCTS.filter((p) => p.stockQuantity >= 1 && p.stockQuantity <= 5);
    const soldOut = SEED_PRODUCTS.filter((p) => p.stockQuantity === 0);
    expect(lowStock.map((p) => p.slug)).toEqual(["cookies-and-cream"]);
    expect(soldOut.map((p) => p.slug)).toEqual(["lemon-cream"]);
  });

  it("every category slug referenced by a product is one of the 3 declared categories", () => {
    const declaredSlugs = new Set(SEED_CATEGORIES.map((c) => c.slug));
    for (const product of SEED_PRODUCTS) {
      expect(declaredSlugs.has(product.categorySlug)).toBe(true);
    }
  });

  it("every slug is unique and matches the categories_slug_fmt / products_slug_fmt pattern", () => {
    const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    const allSlugs = [
      ...SEED_CATEGORIES.map((c) => c.slug),
      SEED_TAG.slug,
      ...SEED_PRODUCTS.map((p) => p.slug),
    ];
    for (const slug of allSlugs) {
      expect(slug).toMatch(slugPattern);
    }
    expect(new Set(SEED_PRODUCTS.map((p) => p.slug)).size).toBe(SEED_PRODUCTS.length);
  });

  it("every product has a positive price (BR-07) and non-negative stock (BR-04)", () => {
    for (const product of SEED_PRODUCTS) {
      expect(product.priceCents).toBeGreaterThan(0);
      expect(product.stockQuantity).toBeGreaterThanOrEqual(0);
    }
  });
});
