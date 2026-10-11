import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import pino from "pino";
import { createLoggerOptions } from "../src/logger.js";
import { testConfig } from "./helpers/test-config.js";

function captureStream(): { stream: Writable; output: () => string } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return { stream, output: () => chunks.join("") };
}

describe("E1-06 log redaction (NFR-06)", () => {
  it("never writes a raw phone number to the logs", () => {
    const { stream, output } = captureStream();
    const logger = pino(createLoggerOptions(testConfig({ LOG_LEVEL: "info" })), stream);

    logger.info(
      { req: { body: { customer: { name: "Ana Souza", phone: "+5511912345678" } } } },
      "order attempt",
    );

    const text = output();
    expect(text).not.toContain("+5511912345678");
    expect(text).not.toContain("Ana Souza");
    expect(text).toContain("[redacted]");
  });

  it("redacts a phone field at any depth via the *.phone wildcard", () => {
    const { stream, output } = captureStream();
    const logger = pino(createLoggerOptions(testConfig({ LOG_LEVEL: "info" })), stream);

    logger.info({ customer: { phone: "+5511999998888" } }, "customer upsert");

    expect(output()).not.toContain("+5511999998888");
  });
});
