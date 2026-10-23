import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import { createOrdersController } from "../controllers/orders.controller.js";
import { CustomerRepository } from "../repositories/customer.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { ProductRepository } from "../repositories/product.repository.js";
import { requireStaffToken } from "../plugins/staff-auth.js";
import type { OrderExpiry } from "../services/order-expiry.service.js";
import { OrderService } from "../services/order.service.js";

/**
 * POST /api/orders (stricter rate limit, 07-api-spec.md §1), GET /api/orders/{code}
 * (§3.4, §3.5) and the staff PATCH /api/orders/{code}/pickup (§3.6, BR-21).
 */
export default async function ordersRoutes(
  app: FastifyInstance,
  opts: {
    config: Config;
    expiry: OrderExpiry;
    now?: () => Date;
    orderService?: OrderService;
  },
): Promise<void> {
  const service =
    opts.orderService ??
    new OrderService(
      app.prisma,
      (tx) => ({
        products: new ProductRepository(tx),
        customers: new CustomerRepository(tx),
        orders: new OrderRepository(tx),
      }),
      { expiry: opts.expiry, now: opts.now },
    );
  const controller = createOrdersController(service);
  const ordersRateLimit = {
    max: opts.config.ORDERS_RATE_LIMIT_MAX,
    timeWindow: opts.config.RATE_LIMIT_WINDOW_MS,
  };

  app.post("/orders", {
    config: { rateLimit: ordersRateLimit },
    handler: controller.createOrder,
  });
  app.get<{ Params: { code: string } }>("/orders/:code", controller.getOrder);
  // Same strict limit as POST: it also slows down guessing of the staff token.
  app.patch<{ Params: { code: string } }>("/orders/:code/pickup", {
    config: { rateLimit: ordersRateLimit },
    preHandler: requireStaffToken(opts.config.STAFF_API_TOKEN),
    handler: controller.markPickedUp,
  });
}
