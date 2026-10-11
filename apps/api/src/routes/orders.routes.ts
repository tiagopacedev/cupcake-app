import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import { createOrdersController } from "../controllers/orders.controller.js";
import { CustomerRepository } from "../repositories/customer.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { ProductRepository } from "../repositories/product.repository.js";
import { OrderService } from "../services/order.service.js";

/** POST /api/orders (stricter rate limit, 07-api-spec.md §1) and GET /api/orders/{code} (§3.4, §3.5). */
export default async function ordersRoutes(
  app: FastifyInstance,
  opts: { config: Config; orderService?: OrderService },
): Promise<void> {
  const service =
    opts.orderService ??
    new OrderService(app.prisma, (tx) => ({
      products: new ProductRepository(tx),
      customers: new CustomerRepository(tx),
      orders: new OrderRepository(tx),
    }));
  const controller = createOrdersController(service);

  app.post("/orders", {
    config: {
      rateLimit: {
        max: opts.config.ORDERS_RATE_LIMIT_MAX,
        timeWindow: opts.config.RATE_LIMIT_WINDOW_MS,
      },
    },
    handler: controller.createOrder,
  });
  app.get<{ Params: { code: string } }>("/orders/:code", controller.getOrder);
}
