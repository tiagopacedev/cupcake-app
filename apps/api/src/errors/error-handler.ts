import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { ErrorCode } from "shared";
import { AppError } from "./app-error.js";

interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

function fieldsFromZodError(error: ZodError): { fields: { path: string; message: string }[] } {
  return {
    fields: error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    })),
  };
}

/**
 * Single global error handler (02-architecture.md §7). Maps AppError to its
 * own code/status, Zod validation failures to VALIDATION_ERROR, 404s to
 * NOT_FOUND, and anything else to INTERNAL_ERROR — logged with its stack,
 * never returned to the client.
 */
export function globalErrorHandler(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const requestId = request.id;

  if (error instanceof AppError) {
    const body: ErrorResponseBody = {
      error: { code: error.code, message: error.message, details: error.details, requestId },
    };
    reply.status(error.status).send(body);
    return;
  }

  if (error instanceof ZodError) {
    const body: ErrorResponseBody = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request failed validation.",
        details: fieldsFromZodError(error),
        requestId,
      },
    };
    reply.status(400).send(body);
    return;
  }

  const fastifyError = error as FastifyError;
  if (fastifyError.validation) {
    const body: ErrorResponseBody = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request failed validation.",
        details: {
          fields: fastifyError.validation.map((v) => ({
            path: v.instancePath || "(root)",
            message: v.message ?? "Invalid value",
          })),
        },
        requestId,
      },
    };
    reply.status(400).send(body);
    return;
  }

  // Malformed body (e.g. invalid JSON) that Fastify rejects before our schema runs.
  if (fastifyError.statusCode === 400) {
    const body: ErrorResponseBody = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request failed validation.",
        details: { fields: [{ path: "(body)", message: "Invalid request body" }] },
        requestId,
      },
    };
    reply.status(400).send(body);
    return;
  }

  if (fastifyError.statusCode === 404) {
    const body: ErrorResponseBody = {
      error: { code: "NOT_FOUND", message: "Route not found.", requestId },
    };
    reply.status(404).send(body);
    return;
  }

  if (fastifyError.statusCode === 429) {
    const body: ErrorResponseBody = {
      error: { code: "RATE_LIMITED", message: "Too many requests.", requestId },
    };
    reply.status(429).send(body);
    return;
  }

  // Unexpected failure: log with the stack, never leak it to the client.
  request.log.error({ err: error }, "Unhandled error");
  const body: ErrorResponseBody = {
    error: { code: "INTERNAL_ERROR", message: "Unexpected server error.", requestId },
  };
  reply.status(500).send(body);
}

/** 404 handler for unknown routes (registered as Fastify's setNotFoundHandler). */
export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
  const body: ErrorResponseBody = {
    error: { code: "NOT_FOUND", message: "Route not found.", requestId: request.id },
  };
  reply.status(404).send(body);
}
