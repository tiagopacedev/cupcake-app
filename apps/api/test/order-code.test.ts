import { describe, expect, it } from "vitest";
import { ORDER_CODE_ALPHABET, ORDER_CODE_PATTERN } from "shared";
import { generateOrderCode } from "../src/services/order-code.js";

describe("BR-13 order code generator", () => {
  it("produces CUP- plus six characters of the safe alphabet", () => {
    for (let i = 0; i < 500; i += 1) {
      expect(generateOrderCode()).toMatch(ORDER_CODE_PATTERN);
    }
  });

  it("never emits ambiguous characters (0, O, 1, I, L)", () => {
    for (let i = 0; i < 2000; i += 1) {
      expect(generateOrderCode().slice(4)).not.toMatch(/[01OIL]/);
    }
  });

  it("uses the injected random source, one draw per character", () => {
    const draws: number[] = [];
    const code = generateOrderCode((max) => {
      draws.push(max);
      return 0;
    });
    expect(code).toBe(`CUP-${ORDER_CODE_ALPHABET[0]!.repeat(6)}`);
    expect(draws).toEqual(Array(6).fill(31));
  });

  it("can reach the first and last alphabet characters", () => {
    expect(generateOrderCode(() => 30)).toBe(`CUP-${"Z".repeat(6)}`);
  });

  it("is non-sequential: 10 000 codes are effectively unique", () => {
    // 31^6 ≈ 887 million codes: among 10 000 draws a birthday collision has
    // ~5% probability, so allow a couple (the database constraint plus the
    // transaction retry handle real ones) while still catching a stuck or
    // low-entropy generator.
    const codes = new Set(Array.from({ length: 10_000 }, () => generateOrderCode()));
    expect(10_000 - codes.size).toBeLessThanOrEqual(2);
  });
});
