import type { Prisma } from "database";

export interface NewOrder {
  code: string;
  customerId: string;
  totalCents: number;
  /** Set by the service from its clock so `readyAt`/`expiresAt` are consistent with it (BR-12). */
  createdAt: Date;
  readyAt: Date;
  expiresAt: Date;
  items: { productId: string; quantity: number; unitPriceCents: number }[];
}

const orderWithDetails = {
  customer: { select: { name: true } },
  items: {
    include: { product: { select: { id: true, slug: true, name: true, imageUrl: true } } },
  },
} satisfies Prisma.OrderInclude;

/** Prisma access for orders (02-architecture.md §3): queries only. */
export class OrderRepository {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  /** Inserts the order (status defaults to AWAITING_PICKUP, BR-10) with its lines; the unit price is the price at purchase (BR-07). */
  create(order: NewOrder) {
    return this.prisma.order.create({
      data: {
        code: order.code,
        customerId: order.customerId,
        totalCents: order.totalCents,
        createdAt: order.createdAt,
        readyAt: order.readyAt,
        expiresAt: order.expiresAt,
        items: { create: order.items },
      },
      select: { createdAt: true, readyAt: true, expiresAt: true, pickupStatus: true },
    });
  }

  findByCode(code: string) {
    return this.prisma.order.findUnique({ where: { code }, include: orderWithDetails });
  }

  /** Cheap check run on every request, so the expiry transaction only opens when there is work (BR-20). */
  async hasOverdue(now: Date): Promise<boolean> {
    const order = await this.prisma.order.findFirst({
      where: { pickupStatus: "AWAITING_PICKUP", expiresAt: { lte: now } },
      select: { id: true },
    });
    return order !== null;
  }

  /**
   * Marks every overdue AWAITING_PICKUP order EXPIRED and returns the ids this call
   * changed. The conditional UPDATE is what makes the stock release happen exactly
   * once: a concurrent caller waits on the row lock, re-evaluates the WHERE clause
   * against the updated row and no longer matches it (BR-20).
   */
  async expireOverdue(now: Date): Promise<string[]> {
    const expired = await this.prisma.order.updateManyAndReturn({
      where: { pickupStatus: "AWAITING_PICKUP", expiresAt: { lte: now } },
      data: { pickupStatus: "EXPIRED" },
      select: { id: true },
    });
    return expired.map((order) => order.id);
  }

  /** Units per product across the given orders, to give back to stock (BR-20). */
  async quantitiesByProduct(
    orderIds: string[],
  ): Promise<{ productId: string; quantity: number }[]> {
    const rows = await this.prisma.orderItem.groupBy({
      by: ["productId"],
      where: { orderId: { in: orderIds } },
      _sum: { quantity: true },
    });
    return rows.map((row) => ({ productId: row.productId, quantity: row._sum.quantity ?? 0 }));
  }

  /** AWAITING_PICKUP → PICKED_UP, conditional on the current status. Returns the rows changed: 1 on success, 0 otherwise (BR-21). */
  async markPickedUp(code: string): Promise<number> {
    const result = await this.prisma.order.updateMany({
      where: { code, pickupStatus: "AWAITING_PICKUP" },
      data: { pickupStatus: "PICKED_UP" },
    });
    return result.count;
  }
}

export type OrderRecord = NonNullable<Awaited<ReturnType<OrderRepository["findByCode"]>>>;
