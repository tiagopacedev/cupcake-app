import { describe, expect, it } from "vitest";
import { envSchema } from "../src/config.js";

const DATABASE_URL = "postgresql://cupcake:cupcake@localhost:5432/cupcake_dev?sslmode=disable";

describe("E1-04/E2-05 config.ts env parsing", () => {
  it("parses a complete, valid environment", () => {
    const result = envSchema.safeParse({ WEB_ORIGIN: "https://cupcake-web.example", DATABASE_URL });
    expect(result.success).toBe(true);
  });

  it("fails clearly when WEB_ORIGIN is missing", () => {
    const result = envSchema.safeParse({ DATABASE_URL });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "WEB_ORIGIN")).toBe(true);
    }
  });

  it("fails clearly when DATABASE_URL is missing (E2-05)", () => {
    const result = envSchema.safeParse({ WEB_ORIGIN: "https://cupcake-web.example" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "DATABASE_URL")).toBe(
        true,
      );
    }
  });

  it("defaults LOG_LEVEL, PORT and rate-limit settings", () => {
    const result = envSchema.safeParse({ WEB_ORIGIN: "https://cupcake-web.example", DATABASE_URL });
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
      DATABASE_URL,
      LOG_LEVEL: "verbose",
    });
    expect(result.success).toBe(false);
  });
});
