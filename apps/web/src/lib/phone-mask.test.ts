import { describe, expect, it } from "vitest";
import { maskPhone } from "./phone-mask";

describe("§8.1 phone mask while typing", () => {
  it.each([
    ["", ""],
    ["1", "(1"],
    ["11", "(11"],
    ["119", "(11) 9"],
    ["1191234", "(11) 91234"],
    ["11912345", "(11) 91234-5"],
    ["11912345678", "(11) 91234-5678"],
  ])("%j → %j", (typed, expected) => {
    expect(maskPhone(typed)).toBe(expected);
  });

  it("is idempotent on an already masked value", () => {
    expect(maskPhone("(11) 91234-5678")).toBe("(11) 91234-5678");
  });

  it("drops non-digits and ignores digits beyond 11", () => {
    expect(maskPhone("(11) 9abc1234-56789999")).toBe("(11) 91234-5678");
  });

  it("drops a pasted +55 / 55 country code", () => {
    expect(maskPhone("+55 11 91234-5678")).toBe("(11) 91234-5678");
    expect(maskPhone("5511912345678")).toBe("(11) 91234-5678");
  });

  it("keeps a DDD 55 number typed without a country code", () => {
    expect(maskPhone("55912345678")).toBe("(55) 91234-5678");
  });

  it("lets the user delete back through the punctuation", () => {
    expect(maskPhone("(11) ")).toBe("(11");
    expect(maskPhone("(11")).toBe("(11");
    expect(maskPhone("(1")).toBe("(1");
    expect(maskPhone("(")).toBe("");
  });
});
