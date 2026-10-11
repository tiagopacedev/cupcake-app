import { describe, expect, it } from "vitest";
import { expectToMatchContract } from "./helpers/contract.js";

const respond = (statusCode: number, body: unknown) => ({ statusCode, json: () => body });

describe("E4-01 expectToMatchContract (05-testing-strategy.md §3.4)", () => {
  it("accepts a response that matches the documented schema", () => {
    expect(() =>
      expectToMatchContract(respond(200, { status: "ok", database: "ok" }), "getHealth", 200),
    ).not.toThrow();
  });

  it("fails a deliberately wrong response body", () => {
    expect(() =>
      expectToMatchContract(respond(200, { status: "up", database: "ok" }), "getHealth", 200),
    ).toThrow(/violates docs\/openapi.yaml/);
  });

  it("fails when the body has an undocumented extra property", () => {
    expect(() =>
      expectToMatchContract(
        respond(200, { status: "ok", database: "ok", phone: "+5511912345678" }),
        "getHealth",
        200,
      ),
    ).toThrow(/violates docs\/openapi.yaml/);
  });

  it("fails when the status code differs from the expected one", () => {
    expect(() =>
      expectToMatchContract(respond(500, { status: "ok", database: "ok" }), "getHealth", 200),
    ).toThrow(/expected status 200, got 500/);
  });

  it("validates shared error responses through their $ref", () => {
    const error = {
      error: { code: "VALIDATION_ERROR", message: "Request failed validation.", requestId: "r-1" },
    };
    expect(() => expectToMatchContract(respond(400, error), "listProducts", 400)).not.toThrow();
    expect(() =>
      expectToMatchContract(respond(400, { error: { code: "NOPE" } }), "listProducts", 400),
    ).toThrow(/violates docs\/openapi.yaml/);
  });

  it("rejects unknown operations and undocumented statuses", () => {
    expect(() => expectToMatchContract(respond(200, {}), "doesNotExist", 200)).toThrow(
      /not found in docs\/openapi.yaml/,
    );
    expect(() => expectToMatchContract(respond(418, {}), "getHealth", 418)).toThrow(
      /documents no 418 response/,
    );
  });
});
