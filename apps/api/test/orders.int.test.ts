import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "database";
import { buildApp } from "../src/build-app.js";
import { CustomerRepository } from "../src/repositories/customer.repository.js";
import { OrderRepository } from "../src/repositories/order.repository.js";
import { ProductRepository } from "../src/repositories/product.repository.js";
import { OrderExpiryService } from "../src/services/order-expiry.service.js";
import { OrderService } from "../src/services/order.service.js";
import { expectToMatchContract } from "./helpers/contract.js";
import { createTestPrisma, requireTestDatabaseUrl, resetAndSeed } from "./helpers/db.js";
import { testConfig } from "./helpers/test-config.js";

/**
 * Order endpoints against a real PostgreSQL (05-testing-strategy.md §3.2):
 * POST /api/orders (US-11, US-12, US-15, US-19, BR-07…BR-15) and
 * GET /api/orders/{code} (US-18, BR-12, BR-16), the pickup schedule (BR-12),
 * order expiry (BR-20, US-25) and the staff pickup endpoint (BR-21, US-24), every
 * response checked against docs/openapi.yaml. The clock is injected, so the
 * results do not depend on the time of day the suite runs.
 */
const PHONE = "(11) 91234-5678";
const PHONE_E164 = "+5511912345678";
const STAFF_TOKEN = "staff-test-token-0123456789abcdef0123456789";

/** Tuesday 2026-10-13 14:35 in Sao Paulo: the store is open (Tuesday to Sunday, 10:00-19:00). */
const TUESDAY_AFTERNOON = new Date("2026-10-13T17:35:00.000Z");

describe("orders API (real database)", () => {
  let app: FastifyInstance;
  /** Same API with a configured staff token (BR-21); `app` has none. */
  let staffApp: FastifyInstance;
  let prisma: PrismaClient;
  let now = TUESDAY_AFTERNOON;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    prisma = createTestPrisma();
    // High limits: the rate limit has its own test below; here every request comes from one IP.
    const config = testConfig({
      DATABASE_URL: requireTestDatabaseUrl(),
      RATE_LIMIT_MAX: 10_000,
      ORDERS_RATE_LIMIT_MAX: 10_000,
    });
    const clock = { now: () => now };
    app = await buildApp(config, clock);
    staffApp = await buildApp({ ...config, STAFF_API_TOKEN: STAFF_TOKEN }, clock);
  });

  beforeEach(async () => {
    now = TUESDAY_AFTERNOON;
    await resetAndSeed(prisma);
    for (const product of await prisma.product.findMany()) ids[product.slug] = product.id;
  });

  afterAll(async () => {
    await app.close();
    await staffApp.close();
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
      const expiry = new OrderExpiryService(
        prisma,
        (tx) => ({ orders: new OrderRepository(tx), products: new ProductRepository(tx) }),
        () => now,
      );
      const service = new OrderService(
        prisma,
        (tx) => ({
          products: new ProductRepository(tx),
          customers: new CustomerRepository(tx),
          orders: new OrderRepository(tx),
        }),
        { expiry, now: () => now, generateCode: () => codes.shift() ?? "CUP-ZZZZZZ" },
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

    it("returns the public view: first name, stored schedule, items, total, no phone", async () => {
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
      expect(body).toMatchObject({
        createdAt: "2026-10-13T17:35:00.000Z",
        readyAt: "2026-10-13T17:50:00.000Z", // 15 minutes later, store open (BR-12)
        expiresAt: "2026-10-13T22:00:00.000Z", // closing time (BR-20)
      });
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

  describe("BR-12 pickup schedule from the store's opening hours (US-13 AC4)", () => {
    const orderAt = async (instant: string) => {
      now = new Date(instant);
      const res = await post(order([{ slug: "chocolate-crush", quantity: 1 }]));
      expectToMatchContract(res, "createOrder", 201);
      return res.json() as { createdAt: string; readyAt: string; expiresAt: string; code: string };
    };

    it("open: ready 15 minutes after the order, expires at closing time, both stored", async () => {
      const body = await orderAt("2026-10-13T17:35:00.000Z"); // Tuesday 14:35
      expect(body).toMatchObject({
        createdAt: "2026-10-13T17:35:00.000Z",
        readyAt: "2026-10-13T17:50:00.000Z",
        expiresAt: "2026-10-13T22:00:00.000Z",
      });
      const stored = await prisma.order.findUniqueOrThrow({ where: { code: body.code } });
      expect(stored.readyAt.toISOString()).toBe("2026-10-13T17:50:00.000Z");
      expect(stored.expiresAt.toISOString()).toBe("2026-10-13T22:00:00.000Z");
    });

    it("tester finding: an order at 22:00 is accepted and ready the next day at 10:15", async () => {
      const body = await orderAt("2026-10-14T01:00:00.000Z"); // Tuesday 22:00
      expect(body.readyAt).toBe("2026-10-14T13:15:00.000Z"); // Wednesday 10:15
      expect(body.expiresAt).toBe("2026-10-14T22:00:00.000Z"); // Wednesday 19:00
    });

    it("Monday is closed: an order on Monday is ready on Tuesday", async () => {
      const body = await orderAt("2026-10-12T15:00:00.000Z"); // Monday 12:00
      expect(body.readyAt).toBe("2026-10-13T13:15:00.000Z");
    });

    it("Sunday evening skips the closed Monday: ready on Tuesday at 10:15", async () => {
      const body = await orderAt("2026-10-19T01:00:00.000Z"); // Sunday 22:00
      expect(body.readyAt).toBe("2026-10-20T13:15:00.000Z");
    });
  });

  describe("BR-20 expiry and stock release (US-25)", () => {
    const place = async (slug = "chocolate-crush", quantity = 2) => {
      const res = await post(order([{ slug, quantity }]));
      expectToMatchContract(res, "createOrder", 201);
      return res.json() as { code: string; expiresAt: string };
    };
    const statusOf = async (code: string) =>
      (await prisma.order.findUniqueOrThrow({ where: { code } })).pickupStatus;
    const afterClosing = (expiresAt: string) => new Date(new Date(expiresAt).getTime() + 1_000);

    it("AC1: once the closing time has passed, listing the catalog expires the order and restores the stock", async () => {
      const { code, expiresAt } = await place();
      expect(await stockOf("chocolate-crush")).toBe(33);

      now = afterClosing(expiresAt);
      const res = await app.inject({ method: "GET", url: "/api/products" });
      expectToMatchContract(res, "listProducts", 200);
      const crush = res
        .json()
        .products.find((product: { slug: string }) => product.slug === "chocolate-crush");
      expect(crush.stockQuantity).toBe(35);
      expect(await statusOf(code)).toBe("EXPIRED");
      expect(await stockOf("chocolate-crush")).toBe(35);
    });

    it("an order that is not overdue yet keeps its stock reserved", async () => {
      const { code, expiresAt } = await place();
      now = new Date(new Date(expiresAt).getTime() - 1_000);
      await app.inject({ method: "GET", url: "/api/products" });
      expect(await statusOf(code)).toBe("AWAITING_PICKUP");
      expect(await stockOf("chocolate-crush")).toBe(33);
    });

    it("the order stays viewable by its code and is returned as EXPIRED", async () => {
      const { code, expiresAt } = await place();
      now = afterClosing(expiresAt);
      const res = await app.inject({ method: "GET", url: `/api/orders/${code}` });
      expectToMatchContract(res, "getOrder", 200);
      expect(res.json().pickupStatus).toBe("EXPIRED");
    });

    it("AC2: releases the stock exactly once, even when several requests expire it at the same time", async () => {
      const { code, expiresAt } = await place();
      now = afterClosing(expiresAt);
      await Promise.all([
        app.inject({ method: "GET", url: "/api/products" }),
        app.inject({ method: "GET", url: "/api/products" }),
        app.inject({ method: "GET", url: `/api/orders/${code}` }),
        app.inject({ method: "GET", url: `/api/orders/${code}` }),
        app.inject({ method: "GET", url: "/api/products?category=chocolate" }),
      ]);
      expect(await stockOf("chocolate-crush")).toBe(35);
      await app.inject({ method: "GET", url: "/api/products" });
      expect(await stockOf("chocolate-crush")).toBe(35);
    });

    it("AC3: an order placed after closing is not expired that evening; it expires at closing time of its pickup day", async () => {
      now = new Date("2026-10-14T01:00:00.000Z"); // Tuesday 22:00, store closed
      const { code, expiresAt } = await place();
      expect(expiresAt).toBe("2026-10-14T22:00:00.000Z"); // Wednesday 19:00

      now = new Date("2026-10-14T15:00:00.000Z"); // Wednesday 12:00
      await app.inject({ method: "GET", url: "/api/products" });
      expect(await statusOf(code)).toBe("AWAITING_PICKUP");

      now = new Date("2026-10-14T22:00:01.000Z"); // Wednesday 19:00:01
      await app.inject({ method: "GET", url: "/api/products" });
      expect(await statusOf(code)).toBe("EXPIRED");
    });

    it("creating an order first gives back overdue units, so the freed stock can be ordered", async () => {
      await prisma.product.update({
        where: { slug: "cookies-and-cream" },
        data: { stockQuantity: 3 },
      });
      const first = await place("cookies-and-cream", 3);
      expect(await stockOf("cookies-and-cream")).toBe(0);
      expect((await post(order([{ slug: "cookies-and-cream", quantity: 1 }]))).statusCode).toBe(
        409,
      );

      now = afterClosing(first.expiresAt);
      const second = await post(
        order([{ slug: "cookies-and-cream", quantity: 3 }], {
          name: "Bia",
          phone: "(21) 98888-7777",
        }),
      );
      expectToMatchContract(second, "createOrder", 201);
      expect(await statusOf(first.code)).toBe("EXPIRED");
      expect(await stockOf("cookies-and-cream")).toBe(0);
    });

    it("releases every line of every overdue order, each product once per order", async () => {
      const a = await post(
        order([
          { slug: "chocolate-crush", quantity: 2 },
          { slug: "birthday-vanilla", quantity: 4 },
        ]),
      );
      const b = await post(
        order([{ slug: "chocolate-crush", quantity: 3 }], {
          name: "Bia",
          phone: "(21) 98888-7777",
        }),
      );
      expect(a.statusCode).toBe(201);
      expect(b.statusCode).toBe(201);
      expect(await stockOf("chocolate-crush")).toBe(30);

      now = afterClosing(a.json().expiresAt);
      await app.inject({ method: "GET", url: "/api/products" });
      expect(await stockOf("chocolate-crush")).toBe(35);
      expect(await stockOf("birthday-vanilla")).toBe(40);
    });
  });

  describe("BR-21 staff pickup: PATCH /api/orders/{code}/pickup (US-24)", () => {
    const place = async () => {
      const res = await post(order([{ slug: "chocolate-crush", quantity: 2 }]));
      return res.json() as { code: string; expiresAt: string };
    };
    const pickup = (
      code: string,
      headers: Record<string, string> = { authorization: `Bearer ${STAFF_TOKEN}` },
      target = staffApp,
    ) => target.inject({ method: "PATCH", url: `/api/orders/${code}/pickup`, headers });

    it("AC1: marks the order PICKED_UP; the public view shows the new status", async () => {
      const { code } = await place();
      const res = await pickup(code);
      expectToMatchContract(res, "markOrderPickedUp", 200);
      expect(res.json()).toMatchObject({ code, pickupStatus: "PICKED_UP" });
      const view = await app.inject({ method: "GET", url: `/api/orders/${code}` });
      expect(view.json().pickupStatus).toBe("PICKED_UP");
    });

    it("accepts a lowercase code", async () => {
      const { code } = await place();
      expect((await pickup(code.toLowerCase())).statusCode).toBe(200);
    });

    it("AC2: a missing, wrong or malformed token is 401 UNAUTHORIZED and nothing changes", async () => {
      const { code } = await place();
      const attempts: Record<string, string>[] = [
        {},
        { authorization: "Bearer wrong-token-wrong-token-wrong-token-1234" },
        { authorization: STAFF_TOKEN },
        { authorization: `Basic ${STAFF_TOKEN}` },
        { authorization: "Bearer " },
      ];
      for (const headers of attempts) {
        const res = await pickup(code, headers);
        expectToMatchContract(res, "markOrderPickedUp", 401);
        expect(res.json().error.code).toBe("UNAUTHORIZED");
      }
      expect((await prisma.order.findUniqueOrThrow({ where: { code } })).pickupStatus).toBe(
        "AWAITING_PICKUP",
      );
    });

    it("AC2: a server without a configured token rejects every request, even a bearer one", async () => {
      const { code } = await place();
      const res = await pickup(code, { authorization: `Bearer ${STAFF_TOKEN}` }, app);
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("UNAUTHORIZED");
    });

    it("never echoes the token", async () => {
      const { code } = await place();
      const res = await pickup(code, {
        authorization: "Bearer wrong-token-wrong-token-wrong-token-1234",
      });
      expect(res.body).not.toContain("wrong-token");
    });

    it("AC3: an order that is already PICKED_UP is 409 INVALID_ORDER_STATUS", async () => {
      const { code } = await place();
      await pickup(code);
      const res = await pickup(code);
      expectToMatchContract(res, "markOrderPickedUp", 409);
      expect(res.json().error).toMatchObject({
        code: "INVALID_ORDER_STATUS",
        details: { pickupStatus: "PICKED_UP" },
      });
    });

    it("AC3: an order that has expired is 409 and cannot be picked up", async () => {
      const { code, expiresAt } = await place();
      now = new Date(new Date(expiresAt).getTime() + 1_000);
      const res = await pickup(code);
      expectToMatchContract(res, "markOrderPickedUp", 409);
      expect(res.json().error.details).toEqual({ pickupStatus: "EXPIRED" });
      expect(await stockOf("chocolate-crush")).toBe(35);
    });

    it("AC4: an unknown or malformed code is 404 ORDER_NOT_FOUND (after the token check)", async () => {
      for (const code of ["CUP-ZZZZZZ", "nope"]) {
        const res = await pickup(code);
        expectToMatchContract(res, "markOrderPickedUp", 404);
        expect(res.json().error.code).toBe("ORDER_NOT_FOUND");
      }
      const unauthenticated = await pickup("CUP-ZZZZZZ", {});
      expect(unauthenticated.statusCode).toBe(401);
    });

    it("AC5: a picked-up order never releases its stock, even after closing time", async () => {
      const { code, expiresAt } = await place();
      await pickup(code);
      now = new Date(new Date(expiresAt).getTime() + 3_600_000);
      await app.inject({ method: "GET", url: "/api/products" });
      expect((await prisma.order.findUniqueOrThrow({ where: { code } })).pickupStatus).toBe(
        "PICKED_UP",
      );
      expect(await stockOf("chocolate-crush")).toBe(33);
    });

    it("two staff requests at once: exactly one 200 and one 409", async () => {
      const { code } = await place();
      const results = await Promise.all([pickup(code), pickup(code)]);
      expect(results.map((res) => res.statusCode).sort()).toEqual([200, 409]);
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
