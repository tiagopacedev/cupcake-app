import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";

const digest = (value: string): Buffer => createHash("sha256").update(value).digest();

/**
 * Bearer-token check of the staff pickup endpoint (BR-21, D-26, NFR-06).
 * Returns a Fastify `preHandler` that answers 401 UNAUTHORIZED unless the
 * request carries `Authorization: Bearer <STAFF_API_TOKEN>`. When the server has
 * no token configured, every request is rejected, so a missing secret can never
 * open the endpoint. Both sides are hashed first so `timingSafeEqual` always
 * compares equal-length buffers and the comparison time does not depend on how
 * much of the token matched. The token is never logged.
 */
export function requireStaffToken(token: string | undefined) {
  const expected = token ? digest(token) : undefined;

  return async (request: FastifyRequest): Promise<void> => {
    const presented = /^Bearer (\S+)$/.exec(request.headers.authorization ?? "")?.[1];
    if (!expected || !presented || !timingSafeEqual(digest(presented), expected)) {
      throw new AppError("UNAUTHORIZED", "Staff token required.");
    }
  };
}
