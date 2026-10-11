import { describe, expect, it } from "vitest";
import { envSchema } from "../src/config.js";

describe("E1-04 config.ts env parsing", () => {
  it("parses a complete, valid environment", () => {
    const result = envSchema.safeParse({ WEB_ORIGIN: "https://cupcake-web.example" });
    expect(result.success).toBe(true);
  });

  it("fails clearly when WEB_ORIGIN is missing", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "WEB_ORIGIN")).toBe(true);
    }
  });

  it("defaults LOG_LEVEL, PORT and rate-limit settings", () => {
    const result = envSchema.safeParse({ WEB_ORIGIN: "https://cupcake-web.example" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.LOG_LEVEL).toBe("info");
      expect(result.data.PORT).toBe(4000);
      expect(result.data.RATE_LIMIT_MAX).toBe(120);
    }
  });

  it("rejects an invalid LOG_LEVEL", () => {
    const result = envSchema.safeParse({
      WEB_ORIGIN: "https://cupcake-web.example",
      LOG_LEVEL: "verbose",
    });
    expect(result.success).toBe(false);
  });
});
