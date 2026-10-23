import { describe, expect, it, vi } from "vitest";
import type { Db } from "../src/services/db.js";
import { OrderExpiryService, type ExpiryRepos } from "../src/services/order-expiry.service.js";

const NOW = new Date("2026-10-13T22:00:01.000Z");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function setup(
  options: {
    overdue?: boolean;
    expiredIds?: string[];
    lines?: { productId: string; quantity: number }[];
  } = {},
) {
  const calls: string[] = [];
  const repos: ExpiryRepos = {
    orders: {
      hasOverdue: vi.fn(async () => {
        calls.push("hasOverdue");
        return options.overdue ?? true;
      }),
      expireOverdue: vi.fn(async () => {
        calls.push("expireOverdue");
        return options.expiredIds ?? ["order-1"];
      }),
      quantitiesByProduct: vi.fn(async () => options.lines ?? []),
    },
    products: {
      incrementStock: vi.fn(async (productId: string) => {
        calls.push(`increment:${productId}`);
      }),
    },
  };
  const db = {
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => {
      calls.push("transaction");
      return run({});
    },
  } as unknown as Db;
  return {
    service: new OrderExpiryService(
      db,
      () => repos,
      () => NOW,
    ),
    repos,
    calls,
  };
}

describe("BR-20 order expiry and stock release (US-25)", () => {
  it("does nothing, without a transaction, when no order is overdue", async () => {
    const { service, repos, calls } = setup({ overdue: false });
    expect(await service.expireOverdue()).toBe(0);
    expect(calls).toEqual(["hasOverdue"]);
    expect(repos.orders.expireOverdue).not.toHaveBeenCalled();
  });

  it("checks and expires against the injected clock", async () => {
    const { service, repos } = setup({ lines: [] });
    await service.expireOverdue();
    expect(repos.orders.hasOverdue).toHaveBeenCalledWith(NOW);
    expect(repos.orders.expireOverdue).toHaveBeenCalledWith(NOW);
  });

  it("AC1: gives the units of the expired orders back to each product, in product-id order", async () => {
    const { service, repos, calls } = setup({
      expiredIds: ["order-1", "order-2"],
      lines: [
        { productId: B, quantity: 2 },
        { productId: A, quantity: 5 },
      ],
    });
    expect(await service.expireOverdue()).toBe(2);
    expect(calls).toEqual([
      "hasOverdue",
      "transaction",
      "expireOverdue",
      `increment:${A}`,
      `increment:${B}`,
    ]);
    expect(repos.orders.quantitiesByProduct).toHaveBeenCalledWith(["order-1", "order-2"]);
    expect(repos.products.incrementStock).toHaveBeenCalledWith(A, 5);
    expect(repos.products.incrementStock).toHaveBeenCalledWith(B, 2);
  });

  it("AC2: releases nothing when a concurrent request already expired the orders", async () => {
    const { service, repos } = setup({ expiredIds: [] });
    expect(await service.expireOverdue()).toBe(0);
    expect(repos.orders.quantitiesByProduct).not.toHaveBeenCalled();
    expect(repos.products.incrementStock).not.toHaveBeenCalled();
  });
});
