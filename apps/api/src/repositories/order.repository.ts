import type { Prisma } from "database";

export interface NewOrder {
  code: string;
  customerId: string;
  totalCents: number;
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
        items: { create: order.items },
      },
      select: { createdAt: true, pickupStatus: true },
    });
  }

  findByCode(code: string) {
    return this.prisma.order.findUnique({ where: { code }, include: orderWithDetails });
  }
}

export type OrderRecord = NonNullable<Awaited<ReturnType<OrderRepository["findByCode"]>>>;
