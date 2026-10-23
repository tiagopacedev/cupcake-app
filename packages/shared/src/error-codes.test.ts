import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import YAML from "yaml";
import { ERROR_CODES, ERROR_CODE_STATUS, isErrorCode } from "./error-codes.js";

const openapiPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../docs/openapi.yaml",
);

describe("02-architecture §7 error codes", () => {
  it("has exactly the 9 documented codes", () => {
    expect(ERROR_CODES).toHaveLength(9);
    expect(ERROR_CODES).toEqual([
      "VALIDATION_ERROR",
      "ORDER_NOT_FOUND",
      "NOT_FOUND",
      "PRODUCT_NOT_FOUND",
      "INSUFFICIENT_STOCK",
      "INVALID_ORDER_STATUS",
      "UNAUTHORIZED",
      "RATE_LIMITED",
      "INTERNAL_ERROR",
    ]);
  });

  it("matches the ErrorCode enum in docs/openapi.yaml (contract)", () => {
    const doc = YAML.parse(readFileSync(openapiPath, "utf8")) as {
      components: { schemas: { ErrorCode: { enum: string[] } } };
    };
    const openapiCodes = doc.components.schemas.ErrorCode.enum;
    expect(new Set(ERROR_CODES)).toEqual(new Set(openapiCodes));
  });

  it("maps every code to the HTTP status in 02-architecture §7", () => {
    expect(ERROR_CODE_STATUS.VALIDATION_ERROR).toBe(400);
    expect(ERROR_CODE_STATUS.ORDER_NOT_FOUND).toBe(404);
    expect(ERROR_CODE_STATUS.NOT_FOUND).toBe(404);
    expect(ERROR_CODE_STATUS.PRODUCT_NOT_FOUND).toBe(409);
    expect(ERROR_CODE_STATUS.INSUFFICIENT_STOCK).toBe(409);
    expect(ERROR_CODE_STATUS.INVALID_ORDER_STATUS).toBe(409);
    expect(ERROR_CODE_STATUS.UNAUTHORIZED).toBe(401);
    expect(ERROR_CODE_STATUS.RATE_LIMITED).toBe(429);
    expect(ERROR_CODE_STATUS.INTERNAL_ERROR).toBe(500);
  });

  it("isErrorCode narrows unknown values", () => {
    expect(isErrorCode("VALIDATION_ERROR")).toBe(true);
    expect(isErrorCode("NOT_A_CODE")).toBe(false);
    expect(isErrorCode(42)).toBe(false);
  });
});
