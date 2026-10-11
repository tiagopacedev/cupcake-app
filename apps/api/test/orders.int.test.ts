import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "database";
import { buildApp } from "../src/build-app.js";
import { CustomerRepository } from "../src/repositories/customer.repository.js";
import { OrderRepository } from "../src/repositories/order.repository.js";
import { ProductRepository } from "../src/repositories/product.repository.js";
import { OrderService } from "../src/services/order.service.js";
import { expectToMatchContract } from "./helpers/contract.js";
import { createTestPrisma, requireTestDatabaseUrl, resetAndSeed } from "./helpers/db.js";
import { testConfig } from "./helpers/test-config.js";

/**
 * Order endpoints against a real PostgreSQL (05-testing-strategy.md §3.2):
 * POST /api/orders (US-11, US-12, US-15, US-19, BR-07…BR-15) and
 * GET /api/orders/{code} (US-18, BR-12, BR-16), every response checked
 * against docs/openapi.yaml.
 */
const PHONE = "(11) 91234-5678";
const PHONE_E164 = "+5511912345678";

describe("orders API (real database)", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    prisma = createTestPrisma();
    // High limits: the rate limit has its own test below; here every request comes from one IP.
    app = await buildApp(
      testConfig({
        DATABASE_URL: requireTestDatabaseUrl(),
        RATE_LIMIT_MAX: 10_000,
        ORDERS_RATE_LIMIT_MAX: 10_000,
      }),
    );
  });

  beforeEach(async () => {
    await resetAndSeed(prisma);
    for (const product of await prisma.product.findMany()) ids[product.slug] = product.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const order = (
    items: { slug: string; quantity: number }[],
    customer = { name: "Ana Souza", phone: PHONE },
  ) => ({
    customer,
    items: items.map((item) => ({ productId: ids[item.slug], quantity: item.quantity })),
  });
  const post = (payload: unknown) =>
    app.inject({ method: "POST", url: "/api/orders", payload: payload as object });
  const stockOf = async (slug: string) =>
    (await prisma.product.findUniqueOrThrow({ where: { slug } })).stockQuantity;

  describe("POST /api/orders happy path (US-11, US-15 AC1, BR-07, BR-10)", () => {
    it("creates the order: 201, AWAITING_PICKUP, total from DB prices, Location header, stock reserved", async () => {
      const res = await post(
        order([
          { slug: "chocolate-crush", quantity: 2 },
          { slug: "birthday-vanilla", quantity: 1 },
        ]),
      );
      expectToMatchContract(res, "createOrder", 201);

      const body = res.json();
      expect(res.headers.location).toBe(`/api/orders/${body.code}`);
      expect(body.pickupStatus).toBe("AWAITING_PICKUP");
      expect(body.customerFirstName).toBe("Ana");
      expect(body.totalCents).toBe(2 * 1190 + 990);
      expect(body.items).toEqual([
        expect.objectContaining({
          slug: "birthday-vanilla",
          quantity: 1,
          unitPriceCents: 990,
          lineTotalCents: 990,
        }),
        expect.objectContaining({
          slug: "chocolate-crush",
          quantity: 2,
          unitPriceCents: 1190,
          lineTotalCents: 2380,
        }),
      ]);

      expect(await stockOf("chocolate-crush")).toBe(35 - 2);
      expect(await stockOf("birthday-vanilla")).toBe(40 - 1);
      expect(await prisma.order.count()).toBe(1);
    });

    it("BR-16: never returns the phone, and stores it normalized (US-12 AC3)", async () => {
      const res = await post(order([{ slug: "chocolate-crush", quantity: 1 }]));
      expect(res.body).not.toMatch(/phone|\+55|91234|Souza/);
      const customer = await prisma.customer.findFirstOrThrow();
      expect(customer.phone).toBe(PHONE_E164);
    });

    it.each(["11912345678", "+55 11 91234-5678", "(11) 91234-5678"])(
      "US-12 AC3: accepts the phone as %s",
      async (phone) => {
        const res = await post(
          order([{ slug: "chocolate-crush", quantity: 1 }], { name: "Ana", phone }),
        );
        expectToMatchContract(res, "createOrder", 201);
        expect((await prisma.customer.findFirstOrThrow()).phone).toBe(PHONE_E164);
      },
    );

    it("BR-07: stores the unit price at purchase on the order item", async () => {
      await post(order([{ slug: "chocolate-crush", quantity: 3 }]));
      const item = await prisma.orderItem.findFirstOrThrow();
      expect(item).toMatchObject({ quantity: 3, unitPriceCents: 1190 });
    });

    it("BR-10: each submission creates a new order with its own code", async () => {
      const first = await post(order([{ slug: "chocolate-crush", quantity: 1 }]));
      const second = await post(order([{ slug: "chocolate-crush", quantity: 1 }]));
      expect(first.json().code).not.toBe(second.json().code);
      expect(await prisma.order.count()).toBe(2);
    });

    it("BR-15: reuses the customer by phone and updates the name", async () => {
      await post(
        order([{ slug: "chocolate-crush", quantity: 1 }], { name: "Ana Souza", phone: PHONE }),
      );
      const res = await post(
        order([{ slug: "chocolate-crush", quantity: 1 }], {
          name: "Ana Paula",
          phone: "11912345678",
        }),
      );
      expect(res.json().customerFirstName).toBe("Ana");
      const customers = await prisma.customer.findMany();
      expect(customers).toHaveLength(1);
      expect(customers[0]?.name).toBe("Ana Paula");
      expect(await prisma.order.count()).toBe(2);
    });
  });

  describe("validation (US-12, BR-14, BR-06) → 400 VALIDATION_ERROR with fields", () => {
    const expectFieldError = async (payload: unknown, path: string) => {
      const res = await post(payload);
      expectToMatchContract(res, "createOrder", 400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
      const paths = (res.json().error.details.fields as { path: string }[]).map((f) => f.path);
      expect(paths).toContain(path);
      expect(await prisma.order.count()).toBe(0);
      expect(await stockOf("chocolate-crush")).toBe(35);
    };
    const valid = () => order([{ slug: "chocolate-crush", quantity: 1 }]);

    it("AC1: name too short or too long", async () => {
      await expectFieldError(
        { ...valid(), customer: { name: "A", phone: PHONE } },
        "customer.name",
      );
      await expectFieldError(
        { ...valid(), customer: { name: "A".repeat(81), phone: PHONE } },
        "customer.name",
      );
    });

    it("AC2: invalid phone", async () => {
      await expectFieldError(
        { ...valid(), customer: { name: "Ana", phone: "1131234567" } },
        "customer.phone",
      );
    });

    it("rejects an empty item list and a duplicated product", async () => {
      await expectFieldError({ ...valid(), items: [] }, "items");
      const productId = ids["chocolate-crush"];
      await expectFieldError(
        {
          ...valid(),
          items: [
            { productId, quantity: 1 },
            { productId, quantity: 2 },
          ],
        },
        "items.1.productId",
      );
    });

    it("rejects a quantity outside 1..20", async () => {
      for (const quantity of [0, 21, -1, 1.5]) {
        await expectFieldError(
          { ...valid(), items: [{ productId: ids["chocolate-crush"], quantity }] },
          "items.0.quantity",
        );
      }
    });

    it("BR-07: rejects a client-sent price", async () => {
      await expectFieldError(
        { ...valid(), items: [{ productId: ids["chocolate-crush"], quantity: 1, priceCents: 1 }] },
        "items.0",
      );
    });

    it("rejects a malformed JSON body", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/orders",
        headers: { "content-type": "application/json" },
        payload: "{not json",
      });
      expectToMatchContract(res, "createOrder", 400);
    });

    it("rejects a missing body", async () => {
      const res = await app.inject({ method: "POST", url: "/api/orders" });
      expectToMatchContract(res, "createOrder", 400);
    });
  });

  describe("unavailable products (US-19 AC3, BR-04) → 409 PRODUCT_NOT_FOUND", () => {
    it("rejects an inactive product and writes nothing", async () => {
      await prisma.product.update({
        where: { slug: "chocolate-crush" },
        data: { isActive: false },
      });
      const res = await post(
        order([
          { slug: "birthday-vanilla", quantity: 1 },
          { slug: "chocolate-crush", quantity: 1 },
        ]),
      );
      expectToMatchContract(res, "createOrder", 409);
      expect(res.json().error.code).toBe("PRODUCT_NOT_FOUND");
      expect(res.json().error.details.productIds).toEqual([ids["chocolate-crush"]]);
      expect(await prisma.order.count()).toBe(0);
      expect(await prisma.customer.count()).toBe(0);
      expect(await stockOf("birthday-vanilla")).toBe(40);
    });

    it("rejects an unknown product id", async () => {
      const ghost = "99999999-9999-4999-8999-999999999999";
      const res = await post({
        customer: { name: "Ana", phone: PHONE },
        items: [{ productId: ghost, quantity: 1 }],
      });
      expectToMatchContract(res, "createOrder", 409);
      expect(res.json().error.details.productIds).toEqual([ghost]);
    });
  });

  describe("insufficient stock (BR-05, BR-11, US-19) → 409 and nothing changes", () => {
    it("lists every short line and rolls back the lines that did have stock", async () => {
      const res = await post(
        order([
          { slug: "birthday-vanilla", quantity: 5 }, // enough: must not stay decremented
          { slug: "cookies-and-cream", quantity: 4 }, // stock 3
          { slug: "lemon-cream", quantity: 1 }, // stock 0
        ]),
      );
      expectToMatchContract(res, "createOrder", 409);
      expect(res.json().error.code).toBe("INSUFFICIENT_STOCK");
      expect(res.json().error.details.items).toEqual([
        { productId: ids["cookies-and-cream"], requested: 4, available: 3 },
        { productId: ids["lemon-cream"], requested: 1, available: 0 },
      ]);

      expect(await stockOf("birthday-vanilla")).toBe(40);
      expect(await stockOf("cookies-and-cream")).toBe(3);
      expect(await prisma.order.count()).toBe(0);
      expect(await prisma.customer.count()).toBe(0);
    });

    it("US-19 AC1: 2 units requested of a product with 1 left", async () => {
      await prisma.product.update({
        where: { slug: "chocolate-crush" },
        data: { stockQuantity: 1 },
      });
      const res = await post(order([{ slug: "chocolate-crush", quantity: 2 }]));
      expect(res.statusCode).toBe(409);
      expect(res.json().error.details.items).toEqual([
        { productId: ids["chocolate-crush"], requested: 2, available: 1 },
      ]);
      expect(await stockOf("chocolate-crush")).toBe(1);
    });

    it("allows ordering exactly the remaining stock", async () => {
      const res = await post(order([{ slug: "cookies-and-cream", quantity: 3 }]));
      expectToMatchContract(res, "createOrder", 201);
      expect(await stockOf("cookies-and-cream")).toBe(0);
    });
  });

  describe("concurrency (US-15 AC4, BR-11)", () => {
    it("two parallel orders for the last unit: exactly one 201 and one 409, stock ends at 0", async () => {
      await prisma.product.update({
        where: { slug: "chocolate-crush" },
        data: { stockQuantity: 1 },
      });
      const results = await Promise.all([
        post(order([{ slug: "chocolate-crush", quantity: 1 }], { name: "Ana", phone: PHONE })),
        post(
          order([{ slug: "chocolate-crush", quantity: 1 }], {
            name: "Bia",
            phone: "(21) 98888-7777",
          }),
        ),
      ]);
      expect(results.map((res) => res.statusCode).sort()).toEqual([201, 409]);
      const loser = results.find((res) => res.statusCode === 409);
      expect(loser?.json().error.code).toBe("INSUFFICIENT_STOCK");
      expect(await stockOf("chocolate-crush")).toBe(0);
      expect(await prisma.order.count()).toBe(1);
    });

    it("many parallel orders never oversell: 12 requests for 5 units → 5 orders", async () => {
      await prisma.product.update({
        where: { slug: "chocolate-crush" },
        data: { stockQuantity: 5 },
      });
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          post(
            order([{ slug: "chocolate-crush", quantity: 1 }], {
              name: `Cliente ${i}`,
              phone: `(11) 9${String(1000_0000 + i)}`,
            }),
          ),
        ),
      );
      const created = results.filter((res) => res.statusCode === 201);
      expect(created).toHaveLength(5);
      expect(results.filter((res) => res.statusCode === 409)).toHaveLength(7);
      expect(await stockOf("chocolate-crush")).toBe(0);
      expect(await prisma.order.count()).toBe(5);
    });
  });

  describe("code collision (BR-13)", () => {
    it("retries the whole transaction with a new code and decrements the stock only once", async () => {
      const codes = ["CUP-AAAAAA", "CUP-AAAAAA", "CUP-BBBBBB"];
      const service = new OrderService(
        prisma,
        (tx) => ({
          products: new ProductRepository(tx),
          customers: new CustomerRepository(tx),
          orders: new OrderRepository(tx),
        }),
        () => codes.shift() ?? "CUP-ZZZZZZ",
      );
      const input = {
        customer: { name: "Ana", phone: PHONE_E164 },
        items: [{ productId: ids["chocolate-crush"] as string, quantity: 1 }],
      };

      expect((await service.create(input)).code).toBe("CUP-AAAAAA");
      const second = await service.create(input); // collides on AAAAAA, retries with BBBBBB
      expect(second.code).toBe("CUP-BBBBBB");
      expect(await stockOf("chocolate-crush")).toBe(35 - 2);
      expect(await prisma.order.count()).toBe(2);
    });
  });

  describe("GET /api/orders/{code} (US-18, BR-12, BR-16)", () => {
    const place = async () => {
      const res = await post(
        order([
          { slug: "chocolate-crush", quantity: 2 },
          { slug: "birthday-vanilla", quantity: 1 },
        ]),
      );
      return res.json() as { code: string };
    };

    it("returns the public view: first name, readyAt = createdAt + 15 min, items, total, no phone", async () => {
      const { code } = await place();
      const res = await app.inject({ method: "GET", url: `/api/orders/${code}` });
      expectToMatchContract(res, "getOrder", 200);
      const body = res.json();
      expect(body).toMatchObject({
        code,
        pickupStatus: "AWAITING_PICKUP",
        customerFirstName: "Ana",
        totalCents: 3370,
      });
      expect(new Date(body.readyAt).getTime() - new Date(body.createdAt).getTime()).toBe(
        15 * 60_000,
      );
      expect(body.items).toHaveLength(2);
      expect(res.body).not.toMatch(/phone|\+55|91234|Souza/);
    });

    it("accepts a lowercase code", async () => {
      const { code } = await place();
      const res = await app.inject({ method: "GET", url: `/api/orders/${code.toLowerCase()}` });
      expectToMatchContract(res, "getOrder", 200);
      expect(res.json().code).toBe(code);
    });

    it("BR-07: keeps the price paid after the catalog price changes", async () => {
      const { code } = await place();
      await prisma.product.update({
        where: { slug: "chocolate-crush" },
        data: { priceCents: 9999 },
      });
      const res = await app.inject({ method: "GET", url: `/api/orders/${code}` });
      const crush = res
        .json()
        .items.find((item: { slug: string }) => item.slug === "chocolate-crush");
      expect(crush).toMatchObject({ unitPriceCents: 1190, lineTotalCents: 2380 });
      expect(res.json().totalCents).toBe(3370);
    });

    it("returns 404 ORDER_NOT_FOUND for an unknown code and for malformed codes", async () => {
      for (const code of ["CUP-ZZZZZZ", "CUP-123", "nope", "CUP-0OIL11"]) {
        const res = await app.inject({ method: "GET", url: `/api/orders/${code}` });
        expectToMatchContract(res, "getOrder", 404);
        expect(res.json().error.code).toBe("ORDER_NOT_FOUND");
      }
    });
  });

  describe("rate limit on POST /api/orders (07-api-spec.md §1)", () => {
    it("returns 429 RATE_LIMITED after the configured number of requests", async () => {
      const limited = await buildApp(
        testConfig({ DATABASE_URL: requireTestDatabaseUrl(), ORDERS_RATE_LIMIT_MAX: 2 }),
      );
      try {
        const send = () => limited.inject({ method: "POST", url: "/api/orders", payload: {} });
        expect((await send()).statusCode).toBe(400);
        expect((await send()).statusCode).toBe(400);
        const third = await send();
        expectToMatchContract(third, "createOrder", 429);
        expect(third.json().error.code).toBe("RATE_LIMITED");
      } finally {
        await limited.close();
      }
    });
  });
});
