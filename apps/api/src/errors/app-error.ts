import type { ErrorCode } from "shared";
import { ERROR_CODE_STATUS } from "shared";

/**
 * Domain error thrown by services (02-architecture.md §7). The global error
 * handler (errors/error-handler.ts) maps this to the standard ErrorResponse
 * shape and the HTTP status from ERROR_CODE_STATUS.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_CODE_STATUS[code];
    this.details = details;
  }
}
