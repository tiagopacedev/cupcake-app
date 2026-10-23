/**
 * Stable API error codes (02-architecture.md §7, docs/openapi.yaml `ErrorCode`).
 * This list and the OpenAPI enum must always match (verified by error-codes.test.ts
 * and by the API's contract tests, 05-testing-strategy.md §3.4).
 */
export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "ORDER_NOT_FOUND",
  "NOT_FOUND",
  "PRODUCT_NOT_FOUND",
  "INSUFFICIENT_STOCK",
  "INVALID_ORDER_STATUS",
  "UNAUTHORIZED",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** HTTP status each code maps to (02-architecture.md §7 table). */
export const ERROR_CODE_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  ORDER_NOT_FOUND: 404,
  NOT_FOUND: 404,
  PRODUCT_NOT_FOUND: 409,
  INSUFFICIENT_STOCK: 409,
  INVALID_ORDER_STATUS: 409,
  UNAUTHORIZED: 401,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}
