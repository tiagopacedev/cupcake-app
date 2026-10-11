import { describe, expect, it, vi } from "vitest";
import { createOrderSchema } from "shared";
import { AppError } from "../src/errors/app-error.js";
import { OrderService, type Db, type OrderRepos } from "../src/services/order.service.js";
import { firstName, readyAt, toOrderDto } from "../src/services/order.mapper.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const catalog = [
  { id: A, slug: "chocolate-crush", name: "Chocolate Crush", imageUrl: "/a.jpg", priceCents: 1190 },
  {
    id: B,
    slug: "birthday-vanilla",
    name: "Birthday Vanilla",
    imageUrl: "/b.jpg",
    priceCents: 990,
  },
  {
    id: C,
    slug: "cookies-and-cream",
    name: "Cookies & Cream",
    imageUrl: "/c.jpg",
    priceCents: 1290,
  },
];

const request = (items: { productId: string; quantity: number }[]) =>
  createOrderSchema.parse({ customer: { name: "Ana Souza", phone: "(11) 91234-5678" }, items });

function setup(options: { stock?: Record<string, number>; failCreate?: unknown[] } = {}) {
  const stock = { [A]: 10, [B]: 10, [C]: 10, ...options.stock } as Record<string, number>;
  const failures = [...(options.failCreate ?? [])];
  const calls: string[] = [];
  const repos: OrderRepos = {
    products: {
      findActiveByIds: async (ids) => catalog.filter((product) => ids.includes(product.id)),
      decrementStock: async (id, quantity) => {
        calls.push(`decrement:${id}`);
        if ((stock[id] ?? 0) < quantity) return 0;
        stock[id] = (stock[id] ?? 0) - quantity;
        return 1;
      },
      findStock: async (id) => stock[id] ?? null,
    },
    customers: { upsertByPhone: vi.fn(async () => ({ id: "customer-1" })) },
    orders: {
      create: vi.fn(async () => {
        const failure = failures.shift();
        if (failure) throw failure;
        return {
          createdAt: new Date("2026-10-11T17:35:00.000Z"),
          pickupStatus: "AWAITING_PICKUP" as const,
        };
      }),
      findByCode: vi.fn(async () => null),
    },
  };
  const db = {
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run({}),
  } as unknown as Db;
  const codes = [
    "CUP-AAAAAA",
    "CUP-BBBBBB",
    "CUP-CCCCCC",
    "CUP-DDDDDD",
    "CUP-EEEEEE",
    "CUP-FFFFFF",
  ];
  const generateCode = vi.fn(() => codes.shift() ?? "CUP-ZZZZZZ");
  return {
    service: new OrderService(db, () => repos, generateCode),
    repos,
    stock,
    calls,
    generateCode,
  };
}

const uniqueViolation = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

describe("BR-07 / BR-08 totals come from database prices", () => {
  it("sums unit price × quantity and snapshots the price per line", async () => {
    const { service, repos } = setup();
    const order = await service.create(
      request([
        { productId: A, quantity: 2 },
        { productId: B, quantity: 1 },
      ]),
    );
    expect(order.totalCents).toBe(3370);
    expect(
      order.items.map((item) => [item.name, item.unitPriceCents, item.lineTotalCents]),
    ).toEqual([
      ["Birthday Vanilla", 990, 990],
      ["Chocolate Crush", 1190, 2380],
    ]);
    expect(repos.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCents: 3370,
        items: [
          { productId: A, quantity: 2, unitPriceCents: 1190 },
          { productId: B, quantity: 1, unitPriceCents: 990 },
        ],
      }),
    );
  });

  it("BR-10 / BR-16: AWAITING_PICKUP, first name only, no phone in the result", async () => {
    const order = await setup().service.create(request([{ productId: A, quantity: 1 }]));
    expect(order.pickupStatus).toBe("AWAITING_PICKUP");
    expect(order.customerFirstName).toBe("Ana");
    expect(JSON.stringify(order)).not.toMatch(/5511|91234|Souza/);
  });

  it("BR-12: readyAt is createdAt + 15 minutes", async () => {
    const order = await setup().service.create(request([{ productId: A, quantity: 1 }]));
    expect(order.createdAt).toBe("2026-10-11T17:35:00.000Z");
    expect(order.readyAt).toBe("2026-10-11T17:50:00.000Z");
  });

  it("BR-15: upserts the customer by the normalized phone with the new name", async () => {
    const { service, repos } = setup();
    await service.create(request([{ productId: A, quantity: 1 }]));
    expect(repos.customers.upsertByPhone).toHaveBeenCalledWith("Ana Souza", "+5511912345678");
  });
});

describe("BR-11 stock reservation rules", () => {
  it("decrements in product-id order regardless of the order sent", async () => {
    const { service, calls } = setup();
    await service.create(
      request([
        { productId: C, quantity: 1 },
        { productId: A, quantity: 1 },
        { productId: B, quantity: 1 },
      ]),
    );
    expect(calls).toEqual([`decrement:${A}`, `decrement:${B}`, `decrement:${C}`]);
  });

  it("US-19: lists every short line (in request order) and creates nothing", async () => {
    const { service, repos } = setup({ stock: { [A]: 1, [C]: 0 } });
    const error = await service
      .create(
        request([
          { productId: C, quantity: 2 },
          { productId: B, quantity: 1 },
          { productId: A, quantity: 2 },
        ]),
      )
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("INSUFFICIENT_STOCK");
    expect((error as AppError).details).toEqual({
      items: [
        { productId: C, requested: 2, available: 0 },
        { productId: A, requested: 2, available: 1 },
      ],
    });
    expect(repos.customers.upsertByPhone).not.toHaveBeenCalled();
    expect(repos.orders.create).not.toHaveBeenCalled();
  });

  it("US-19 AC3: an unknown or inactive product is PRODUCT_NOT_FOUND and nothing is touched", async () => {
    const { service, calls } = setup();
    const ghost = "99999999-9999-4999-8999-999999999999";
    const error = await service
      .create(
        request([
          { productId: A, quantity: 1 },
          { productId: ghost, quantity: 1 },
        ]),
      )
      .catch((e: unknown) => e);
    expect((error as AppError).code).toBe("PRODUCT_NOT_FOUND");
    expect((error as AppError).details).toEqual({ productIds: [ghost] });
    expect(calls).toEqual([]);
  });
});

describe("BR-13 code collisions retry the whole transaction", () => {
  it("retries with a new code after a unique violation", async () => {
    const { service, generateCode } = setup({ failCreate: [uniqueViolation] });
    const order = await service.create(request([{ productId: A, quantity: 1 }]));
    expect(order.code).toBe("CUP-BBBBBB");
    expect(generateCode).toHaveBeenCalledTimes(2);
  });

  it("gives up after 5 attempts and surfaces the error", async () => {
    const { service, generateCode } = setup({ failCreate: Array(5).fill(uniqueViolation) });
    await expect(service.create(request([{ productId: A, quantity: 1 }]))).rejects.toBe(
      uniqueViolation,
    );
    expect(generateCode).toHaveBeenCalledTimes(5);
  });

  it("does not retry other errors", async () => {
    const boom = new Error("connection reset");
    const { service, generateCode } = setup({ failCreate: [boom] });
    await expect(service.create(request([{ productId: A, quantity: 1 }]))).rejects.toBe(boom);
    expect(generateCode).toHaveBeenCalledTimes(1);
  });
});

describe("US-18 getByCode", () => {
  it.each(["", "CUP-123", "CUP-0OIL11", "nope", "CUP-AAAAAAA"])(
    "treats malformed code %j as ORDER_NOT_FOUND without querying",
    async (code) => {
      const { service, repos } = setup();
      await expect(service.getByCode(code)).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
      expect(repos.orders.findByCode).not.toHaveBeenCalled();
    },
  );

  it("upper-cases the code before the lookup and 404s when it is unknown", async () => {
    const { service, repos } = setup();
    await expect(service.getByCode("cup-7k3q9f")).rejects.toMatchObject({
      code: "ORDER_NOT_FOUND",
    });
    expect(repos.orders.findByCode).toHaveBeenCalledWith("CUP-7K3Q9F");
  });
});

describe("order mapper (BR-12, BR-16)", () => {
  it("takes the first word of the name", () => {
    expect(firstName("Ana Souza")).toBe("Ana");
    expect(firstName("  Maria   da Silva ")).toBe("Maria");
    expect(firstName("Jo")).toBe("Jo");
  });

  it("adds the configured preparation time", () => {
    expect(readyAt(new Date("2026-10-11T23:50:00.000Z")).toISOString()).toBe(
      "2026-10-12T00:05:00.000Z",
    );
  });

  it("keeps the price paid, not the current one, and sorts lines by name", () => {
    const dto = toOrderDto({
      code: "CUP-7K3Q9F",
      pickupStatus: "AWAITING_PICKUP",
      customerName: "Ana Souza",
      createdAt: new Date("2026-10-11T17:35:00.000Z"),
      totalCents: 900,
      items: [
        {
          product: { id: B, slug: "z", name: "Zebra", imageUrl: "/z.jpg" },
          quantity: 1,
          unitPriceCents: 300,
        },
        {
          product: { id: A, slug: "a", name: "Abacaxi", imageUrl: "/a.jpg" },
          quantity: 2,
          unitPriceCents: 300,
        },
      ],
    });
    expect(dto.items.map((item) => item.name)).toEqual(["Abacaxi", "Zebra"]);
    expect(dto.items[0]).toMatchObject({ unitPriceCents: 300, lineTotalCents: 600 });
  });
});
