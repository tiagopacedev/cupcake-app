import { randomUUID } from "node:crypto";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

/**
 * Ensures every response carries the same request id used in the logs
 * (02-architecture.md §8 "Logging"), in the `x-request-id` header.
 * Fastify already assigns `request.id` via `genReqId`; this plugin only
 * echoes it back on the response.
 */
export default fp(async function requestIdPlugin(app: FastifyInstance) {
  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-request-id", request.id);
    return payload;
  });
});

/** Fastify `genReqId` option: reuse an inbound `x-request-id`, else a fresh UUID. */
export function genRequestId(headers: Record<string, string | string[] | undefined>): string {
  const inbound = headers["x-request-id"];
  if (typeof inbound === "string" && inbound.length > 0) {
    return inbound;
  }
  return randomUUID();
}
