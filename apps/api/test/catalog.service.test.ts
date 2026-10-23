import { describe, expect, it, vi } from "vitest";
import { CatalogService } from "../src/services/catalog.service.js";
import type { ProductRecord } from "../src/repositories/product.repository.js";

const category = { id: "c1", slug: "chocolate", name: "Chocolate", sortOrder: 2 };
const bestseller = { id: "t1", slug: "bestseller", name: "Mais vendido" };

function product(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: "3f6c1d2a-6a4e-4b8e-9a1f-2c3d4e5f6a7b",
    categoryId: category.id,
    name: "Cookies & Cream",
    slug: "cookies-and-cream",
    description: "Biscoito · creme",
    priceCents: 1290,
    stockQuantity: 3,
    imageUrl: "/images/products/cookies-and-cream.jpg",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    category,
    tags: [],
    ...overrides,
  } as ProductRecord;
}

function setup(products: ProductRecord[] = [product()]) {
  const findActive = vi.fn(async () => products);
  const categories = { findAllOrdered: vi.fn(async () => [category]) };
  const tags = { findAll: vi.fn(async () => [bestseller]) };
  const expiry = { expireOverdue: vi.fn(async () => 0) };
  return {
    findActive,
    expiry,
    catalog: new CatalogService({ findActive }, categories, tags, expiry),
  };
}

describe("US-01 CatalogService.listProducts", () => {
  it("maps a product to the documented shape with derived stock fields (BR-04, BR-06)", async () => {
    const [dto] = await setup().catalog.listProducts();
    expect(dto).toEqual({
      id: "3f6c1d2a-6a4e-4b8e-9a1f-2c3d4e5f6a7b",
      slug: "cookies-and-cream",
      name: "Cookies & Cream",
      description: "Biscoito · creme",
      priceCents: 1290,
      imageUrl: "/images/products/cookies-and-cream.jpg",
      category: { slug: "chocolate", name: "Chocolate" },
      tags: [],
      stockQuantity: 3,
      stockState: "LOW",
      maxQuantity: 3,
    });
  });

  it("exposes tags as slug + name only and never internal columns", async () => {
    const withTag = product({ tags: [{ tag: bestseller }] as unknown as ProductRecord["tags"] });
    const [dto] = await setup([withTag]).catalog.listProducts();
    expect(dto?.tags).toEqual([{ slug: "bestseller", name: "Mais vendido" }]);
    expect(dto).not.toHaveProperty("isActive");
    expect(dto).not.toHaveProperty("categoryId");
  });

  it("caps maxQuantity at 20 for plentiful stock and reports SOLD_OUT at 0", async () => {
    const dtos = await setup([
      product({ stockQuantity: 35 }),
      product({ id: "b", stockQuantity: 0 }),
    ]).catalog.listProducts();
    expect(dtos.map((d) => [d.stockState, d.maxQuantity])).toEqual([
      ["AVAILABLE", 20],
      ["SOLD_OUT", 0],
    ]);
  });

  it("US-25 AC1: gives back the units of overdue orders before reading the stock (BR-20)", async () => {
    const { catalog, findActive, expiry } = setup();
    await catalog.listProducts();
    expect(expiry.expireOverdue).toHaveBeenCalledTimes(1);
    expect(expiry.expireOverdue.mock.invocationCallOrder[0]).toBeLessThan(
      findActive.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("passes the filter to the repository untouched (BR-03)", async () => {
    const { catalog, findActive } = setup([]);
    await catalog.listProducts({ categorySlug: "fruity" });
    expect(findActive).toHaveBeenCalledWith({ categorySlug: "fruity" });
  });
});

describe("US-02 CatalogService.listFilters", () => {
  it("returns categories and tags as slug + name (BR-02, BR-03)", async () => {
    expect(await setup().catalog.listFilters()).toEqual({
      categories: [{ slug: "chocolate", name: "Chocolate" }],
      tags: [{ slug: "bestseller", name: "Mais vendido" }],
    });
  });
});
