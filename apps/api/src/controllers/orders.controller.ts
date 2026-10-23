import type { FastifyReply, FastifyRequest } from "fastify";
import { createOrderSchema } from "shared";
import type { OrderService } from "../services/order.service.js";

/**
 * HTTP mapping for the order endpoints (02-architecture.md §3): validate the
 * body with the shared schema, call one service method, set status and
 * headers. A ZodError becomes 400 VALIDATION_ERROR in the global handler.
 */
export function createOrdersController(service: OrderService) {
  return {
    createOrder: async (request: FastifyRequest, reply: FastifyReply) => {
      const input = createOrderSchema.parse(request.body);
      const order = await service.create(input);
      reply.status(201).header("Location", `/api/orders/${order.code}`);
      return order;
    },
    getOrder: async (request: FastifyRequest<{ Params: { code: string } }>) =>
      service.getByCode(request.params.code),
    /** Staff handover (BR-21); the bearer token was already checked by the route's preHandler. */
    markPickedUp: async (request: FastifyRequest<{ Params: { code: string } }>) =>
      service.markPickedUp(request.params.code),
  };
}
