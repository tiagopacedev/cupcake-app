import type { Prisma } from "database";
import { TRANSACTION_TIMEOUT_MS, type Db } from "./db.js";

/** What the expiry needs from its repositories (satisfied by the Prisma-backed classes; fakes in unit tests). */
export interface ExpiryRepos {
  orders: {
    hasOverdue(now: Date): PromiseLike<boolean>;
    expireOverdue(now: Date): PromiseLike<string[]>;
    quantitiesByProduct(orderIds: string[]): PromiseLike<{ productId: string; quantity: number }[]>;
  };
  products: { incrementStock(productId: string, quantity: number): PromiseLike<void> };
}

/** The part of the expiry other services depend on. */
export interface OrderExpiry {
  /** Expires every overdue order and gives its units back; returns how many orders it expired. */
  expireOverdue(): Promise<number>;
}

/**
 * Order expiry and stock release (BR-20, US-25, D-25). There is no background
 * job (D-16): overdue orders are expired lazily, at the start of every request
 * that reads or changes catalog stock or an order. The common case is one
 * indexed lookup; only when there is work does it open a transaction that
 * (1) conditionally flips AWAITING_PICKUP → EXPIRED and (2) adds the units back,
 * so the release happens exactly once even with concurrent requests.
 */
export class OrderExpiryService implements OrderExpiry {
  constructor(
    private readonly db: Db,
    private readonly reposFor: (tx: Prisma.TransactionClient) => ExpiryRepos,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async expireOverdue(): Promise<number> {
    const now = this.now();
    if (!(await this.reposFor(this.db).orders.hasOverdue(now))) return 0;

    return this.db.$transaction(
      async (tx) => {
        const repos = this.reposFor(tx);
        const expiredIds = await repos.orders.expireOverdue(now);
        if (expiredIds.length === 0) return 0;

        // Product-id order, the same lock order as order creation (BR-11), avoids deadlocks.
        const lines = await repos.orders.quantitiesByProduct(expiredIds);
        lines.sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));
        for (const line of lines) {
          await repos.products.incrementStock(line.productId, line.quantity);
        }
        return expiredIds.length;
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  }
}
