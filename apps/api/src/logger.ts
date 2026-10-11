import type { LoggerOptions } from "pino";
import type { Config } from "./config.js";

/**
 * Logger options shared by the real app and tests (02-architecture.md §8
 * "Logging"). Kept separate from `app.ts` so a unit test can build a pino
 * instance directly and assert on redaction without going through Fastify.
 */
export function createLoggerOptions(config: Pick<Config, "LOG_LEVEL" | "NODE_ENV">): LoggerOptions {
  return {
    level: config.LOG_LEVEL,
    // Never log a phone number, under any field name, at any depth.
    redact: {
      paths: ["req.body.customer.phone", "req.body.customer.name", "*.phone"],
      censor: "[redacted]",
    },
    ...(config.NODE_ENV === "development"
      ? {
          transport: {
            target: "pino-pretty",
            options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
          },
        }
      : {}),
  };
}
