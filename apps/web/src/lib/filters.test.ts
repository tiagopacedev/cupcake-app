import { describe, expect, it } from "vitest";
import { hrefForFilter, parseFilter, queryForFilter } from "./filters";

describe("US-02 / US-03 filter ↔ API mapping", () => {
  it("maps bestsellers to the bestseller tag", () => {
    expect(queryForFilter("bestsellers")).toEqual({ tag: "bestseller" });
  });

  it.each(["classics", "chocolate", "fruity"] as const)("maps %s to its category", (key) => {
    expect(queryForFilter(key)).toEqual({ category: key });
  });

  it("sends no parameter for Todos", () => {
    expect(queryForFilter(null)).toEqual({});
  });
});

describe("US-02 AC4 filter in the URL", () => {
  it("parses the known keys", () => {
    expect(parseFilter("chocolate")).toBe("chocolate");
    expect(parseFilter("bestsellers")).toBe("bestsellers");
  });

  it("treats a missing, unknown or repeated-bad value as Todos", () => {
    expect(parseFilter(undefined)).toBeNull();
    expect(parseFilter("")).toBeNull();
    expect(parseFilter("desserts")).toBeNull();
    expect(parseFilter(["nope", "chocolate"])).toBeNull();
  });

  it("takes the first value when the parameter is repeated", () => {
    expect(parseFilter(["fruity", "classics"])).toBe("fruity");
  });

  it("builds chip URLs", () => {
    expect(hrefForFilter(null)).toBe("/");
    expect(hrefForFilter("chocolate")).toBe("/?filter=chocolate");
  });
});
