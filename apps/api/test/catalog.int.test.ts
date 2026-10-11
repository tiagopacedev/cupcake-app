import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "database";
import { buildApp } from "../src/build-app.js";
import { expectToMatchContract } from "./helpers/contract.js";
import { createTestPrisma, requireTestDatabaseUrl, resetAndSeed } from "./helpers/db.js";
import { testConfig } from "./helpers/test-config.js";

/**
 * Catalog endpoints against a real PostgreSQL (05-testing-strategy.md §3.2):
 * GET /api/catalog/filters (US-02) and GET /api/products (US-01, US-03,
 * US-04), with every response checked against docs/openapi.yaml.
 */
const SEED_ORDER = [
  "Birthday Vanilla",
  "Red Velvet Classic",
  "Chocolate Crush",
  "Cookies & Cream",
  "Strawberry Kiss",
  "Lemon Cream",
];

interface ProductBody {
  slug: string;
  name: string;
  category: { slug: string; name: string };
  tags: { slug: string; name: string }[];
  stockQuantity: number;
  stockState: string;
  maxQuantity: number;
}

describe("catalog API (real database)", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrisma();
    app = await buildApp(testConfig({ DATABASE_URL: requireTestDatabaseUrl() }));
  });

  beforeEach(async () => {
    await resetAndSeed(prisma);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const get = (url: string) => app.inject({ method: "GET", url });
  const productsOf = (res: { json: () => unknown }) =>
    (res.json() as { products: ProductBody[] }).products;
  const names = (res: { json: () => unknown }) => productsOf(res).map((p) => p.name);

  describe("GET /api/catalog/filters (US-02, BR-02, BR-03)", () => {
    it("returns categories ordered by sortOrder and the tags, with pt-BR names", async () => {
      const res = await get("/api/catalog/filters");
      expectToMatchContract(res, "listCatalogFilters", 200);
      expect(res.json()).toEqual({
        categories: [
          { slug: "classics", name: "Clássicos" },
          { slug: "chocolate", name: "Chocolate" },
          { slug: "fruity", name: "Frutados" },
        ],
        tags: [{ slug: "bestseller", name: "Mais vendido" }],
      });
    });

    it("includes an x-request-id header", async () => {
      const res = await get("/api/catalog/filters");
      expect(res.headers["x-request-id"]).toBeTruthy();
    });
  });

  describe("GET /api/products (US-01, BR-04)", () => {
    it("lists every active product in catalog display order", async () => {
      const res = await get("/api/products");
      expectToMatchContract(res, "listProducts", 200);
      expect(names(res)).toEqual(SEED_ORDER);
    });

    it("hides inactive products (BR-04)", async () => {
      await prisma.product.update({
        where: { slug: "chocolate-crush" },
        data: { isActive: false },
      });
      const res = await get("/api/products");
      expectToMatchContract(res, "listProducts", 200);
      expect(names(res)).toEqual(SEED_ORDER.filter((n) => n !== "Chocolate Crush"));
    });

    it("derives stockState and maxQuantity from the stock (BR-04, BR-06)", async () => {
      const res = await get("/api/products");
      const bySlug = Object.fromEntries(productsOf(res).map((p) => [p.slug, p]));
      expect(bySlug["birthday-vanilla"]).toMatchObject({
        stockQuantity: 40,
        stockState: "AVAILABLE",
        maxQuantity: 20,
      });
      expect(bySlug["cookies-and-cream"]).toMatchObject({
        stockQuantity: 3,
        stockState: "LOW",
        maxQuantity: 3,
      });
      expect(bySlug["lemon-cream"]).toMatchObject({
        stockQuantity: 0,
        stockState: "SOLD_OUT",
        maxQuantity: 0,
      });
    });

    it("returns the category and the bestseller tag of each product", async () => {
      const products = productsOf(await get("/api/products"));
      const crush = products.find((p) => p.slug === "chocolate-crush");
      expect(crush?.category).toEqual({ slug: "chocolate", name: "Chocolate" });
      expect(crush?.tags).toEqual([{ slug: "bestseller", name: "Mais vendido" }]);
      expect(products.find((p) => p.slug === "cookies-and-cream")?.tags).toEqual([]);
    });

    it("never returns a phone or any customer data", async () => {
      const res = await get("/api/products");
      expect(res.body).not.toMatch(/phone|customer/i);
    });
  });

  describe("GET /api/products?category= / ?tag= (US-03, US-04, BR-02, BR-03)", () => {
    it("filters by category", async () => {
      const res = await get("/api/products?category=chocolate");
      expectToMatchContract(res, "listProducts", 200);
      expect(names(res)).toEqual(["Chocolate Crush", "Cookies & Cream"]);
    });

    it("filters by tag across categories (Bestsellers)", async () => {
      const res = await get("/api/products?tag=bestseller");
      expectToMatchContract(res, "listProducts", 200);
      expect(names(res)).toEqual(["Birthday Vanilla", "Chocolate Crush", "Strawberry Kiss"]);
    });

    it("keeps inactive products hidden when filtering", async () => {
      await prisma.product.update({
        where: { slug: "chocolate-crush" },
        data: { isActive: false },
      });
      const res = await get("/api/products?category=chocolate");
      expect(names(res)).toEqual(["Cookies & Cream"]);
    });

    it("rejects category and tag together with 400 VALIDATION_ERROR", async () => {
      const res = await get("/api/products?category=chocolate&tag=bestseller");
      expectToMatchContract(res, "listProducts", 400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a malformed slug with 400 VALIDATION_ERROR", async () => {
      const res = await get("/api/products?category=Not%20A%20Slug");
      expectToMatchContract(res, "listProducts", 400);
      expect(res.json().error.details.fields[0].path).toBe("category");
    });

    it("returns 200 with an empty list for an unknown slug", async () => {
      for (const url of ["/api/products?category=nope", "/api/products?tag=nope"]) {
        const res = await get(url);
        expectToMatchContract(res, "listProducts", 200);
        expect(res.json()).toEqual({ products: [] });
      }
    });
  });
});
