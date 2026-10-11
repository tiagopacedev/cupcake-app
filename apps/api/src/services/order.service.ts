import type { Prisma } from "database";
import { ORDER_CODE_PATTERN, type CreateOrderInput } from "shared";
import { AppError } from "../errors/app-error.js";
import { generateOrderCode } from "./order-code.js";
import { toOrderDto, type OrderDto, type OrderView } from "./order.mapper.js";

/** What the service needs from its repositories (satisfied by the Prisma-backed classes; fakes in unit tests). */
export interface OrderRepos {
  products: {
    findActiveByIds(
      ids: string[],
    ): PromiseLike<
      { id: string; slug: string; name: string; imageUrl: string; priceCents: number }[]
    >;
    decrementStock(productId: string, quantity: number): PromiseLike<number>;
    findStock(productId: string): PromiseLike<number | null>;
  };
  customers: { upsertByPhone(name: string, phone: string): PromiseLike<{ id: string }> };
  orders: {
    create(order: {
      code: string;
      customerId: string;
      totalCents: number;
      items: { productId: string; quantity: number; unitPriceCents: number }[];
    }): PromiseLike<{ createdAt: Date; pickupStatus: "AWAITING_PICKUP" | "PICKED_UP" }>;
    findByCode(code: string): PromiseLike<
      | (Omit<OrderView, "customerName" | "code"> & {
          code: string;
          customer: { name: string };
        })
      | null
    >;
  };
}

export interface Transactor {
  $transaction<T>(
    run: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout?: number },
  ): Promise<T>;
}

/** A Prisma client: usable directly for reads and for opening transactions. */
export type Db = Transactor & Prisma.TransactionClient;

/** Attempts of the whole transaction when the generated code (or a concurrent first order of a new phone) hits a unique violation. */
const MAX_ATTEMPTS = 5;
const TRANSACTION_TIMEOUT_MS = 10_000;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Order rules: BR-07, BR-08, BR-10, BR-11, BR-12, BR-13, BR-15, BR-16 (US-11,
 * US-15, US-18, US-19). `create` is the critical transaction of
 * 02-architecture.md §6.1.
 */
export class OrderService {
  constructor(
    private readonly db: Db,
    private readonly reposFor: (tx: Prisma.TransactionClient) => OrderRepos,
    private readonly generateCode: () => string = generateOrderCode,
  ) {}

  async create(input: CreateOrderInput): Promise<OrderDto> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.db.$transaction(
          (tx) => this.createInTransaction(this.reposFor(tx), input),
          {
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        );
      } catch (error) {
        if (isUniqueViolation(error) && attempt < MAX_ATTEMPTS) continue;
        throw error;
      }
    }
  }

  private async createInTransaction(repos: OrderRepos, input: CreateOrderInput): Promise<OrderDto> {
    // 1. Every product must exist and be active (BR-04), or nothing happens.
    const requestedIds = input.items.map((item) => item.productId);
    const products = new Map(
      (await repos.products.findActiveByIds(requestedIds)).map((product) => [product.id, product]),
    );
    const unavailable = requestedIds.filter((id) => !products.has(id));
    if (unavailable.length > 0) {
      throw new AppError("PRODUCT_NOT_FOUND", "One or more products are unavailable.", {
        productIds: unavailable,
      });
    }

    // 2. Conditional, atomic decrement per line, always in product-id order
    //    (consistent lock order avoids deadlocks). Keep going after a shortage
    //    so the error lists every short line (US-19); the throw rolls back
    //    the decrements that did succeed (BR-11).
    const shortages = new Map<
      string,
      { productId: string; requested: number; available: number }
    >();
    const byProductId = [...input.items].sort((a, b) =>
      a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
    );
    for (const item of byProductId) {
      const updated = await repos.products.decrementStock(item.productId, item.quantity);
      if (updated === 0) {
        const available = (await repos.products.findStock(item.productId)) ?? 0;
        shortages.set(item.productId, {
          productId: item.productId,
          requested: item.quantity,
          available,
        });
      }
    }
    if (shortages.size > 0) {
      throw new AppError("INSUFFICIENT_STOCK", "Not enough stock for one or more items.", {
        // Listed in the order the customer sent them.
        items: requestedIds.flatMap((id) => shortages.get(id) ?? []),
      });
    }

    // 3. Customer by normalized phone, name updated (BR-15).
    const customer = await repos.customers.upsertByPhone(input.customer.name, input.customer.phone);

    // 4. Totals from database prices only; client prices don't exist (BR-07, BR-08).
    const lines = input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPriceCents: products.get(item.productId)?.priceCents ?? 0,
    }));
    const totalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);

    const code = this.generateCode();
    const created = await repos.orders.create({
      code,
      customerId: customer.id,
      totalCents,
      items: lines,
    });

    return toOrderDto({
      code,
      pickupStatus: created.pickupStatus,
      customerName: input.customer.name,
      createdAt: created.createdAt,
      totalCents,
      items: lines.flatMap((line) => {
        const product = products.get(line.productId);
        return product
          ? [{ product, quantity: line.quantity, unitPriceCents: line.unitPriceCents }]
          : [];
      }),
    });
  }

  /** Public order view by code, case-insensitive; malformed and unknown codes are both 404 (BR-16, 07 §3.5). */
  async getByCode(rawCode: string): Promise<OrderDto> {
    const code = rawCode.toUpperCase();
    const notFound = () => new AppError("ORDER_NOT_FOUND", "Order not found.");
    if (!ORDER_CODE_PATTERN.test(code)) throw notFound();

    const order = await this.reposFor(this.db).orders.findByCode(code);
    if (!order) throw notFound();

    return toOrderDto({
      code: order.code,
      pickupStatus: order.pickupStatus,
      customerName: order.customer.name,
      createdAt: order.createdAt,
      totalCents: order.totalCents,
      items: order.items,
    });
  }
}
