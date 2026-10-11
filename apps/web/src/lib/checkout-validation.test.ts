import { describe, expect, it } from "vitest";
import {
  fieldForPath,
  NAME_ERROR,
  PHONE_ERROR,
  validateName,
  validatePhone,
} from "./checkout-validation";

describe("US-12 AC1 name", () => {
  it.each(["", " ", "A", "  A  "])("rejects %j", (name) => {
    expect(validateName(name)).toBe(NAME_ERROR);
  });

  it("accepts 2 to 80 characters after trimming", () => {
    expect(validateName("Jo")).toBeNull();
    expect(validateName(" Ana Souza ")).toBeNull();
    expect(validateName("A".repeat(80))).toBeNull();
    expect(validateName("A".repeat(81))).toBe(NAME_ERROR);
  });

  it("uses the approved copy", () => {
    expect(NAME_ERROR).toBe("Informe seu nome.");
  });
});

describe("US-12 AC2/AC3 phone", () => {
  it.each(["(11) 91234-5678", "11912345678", "+55 11 91234-5678"])("accepts %s", (phone) => {
    expect(validatePhone(phone)).toBeNull();
  });

  it.each(["", "(11) 1234-5678", "(11) 3123-4567", "(01) 91234-5678", "abc"])(
    "rejects %j with the format hint",
    (phone) => {
      expect(validatePhone(phone)).toBe(PHONE_ERROR);
    },
  );

  it("uses the approved copy", () => {
    expect(PHONE_ERROR).toBe("Celular inválido. Ex.: (11) 91234-5678");
  });
});

describe("US-12 AC4 server field mapping", () => {
  it("maps the API paths to form fields", () => {
    expect(fieldForPath("customer.name")).toBe("name");
    expect(fieldForPath("customer.phone")).toBe("phone");
    expect(fieldForPath("items.0.quantity")).toBeNull();
    expect(fieldForPath("(body)")).toBeNull();
  });
});
