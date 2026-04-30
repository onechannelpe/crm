import { describe, expect, it } from "vitest";

import {
  assertBoolean,
  assertFinitePositive,
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";

describe("contracts guards", () => {
  it("assertPositiveInt accepts positive integers", () => {
    expect(assertPositiveInt(1, "x")).toBe(1);
    expect(assertPositiveInt(42, "x")).toBe(42);
  });

  it("assertPositiveInt rejects invalid integers", () => {
    expect(() => assertPositiveInt(0, "x")).toThrow(
      "x must be a positive integer",
    );
    expect(() => assertPositiveInt(-1, "x")).toThrow(
      "x must be a positive integer",
    );
    expect(() => assertPositiveInt(1.5, "x")).toThrow(
      "x must be a positive integer",
    );
    expect(() => assertPositiveInt(Number.NaN, "x")).toThrow(
      "x must be a positive integer",
    );
  });

  it("assertFinitePositive validates finite positive values", () => {
    expect(assertFinitePositive(1, "x")).toBe(1);
    expect(assertFinitePositive(0, "x", true)).toBe(0);
    expect(() => assertFinitePositive(0, "x")).toThrow(
      "x must be greater than 0",
    );
    expect(() => assertFinitePositive(-1, "x")).toThrow(
      "x must be greater than 0",
    );
    expect(() => assertFinitePositive(Number.POSITIVE_INFINITY, "x")).toThrow(
      "x must be a finite number",
    );
  });

  it("assertNonEmptyString trims and validates", () => {
    expect(assertNonEmptyString("  ok  ", "x")).toBe("ok");
    expect(() => assertNonEmptyString("   ", "x")).toThrow("x is required");
  });

  it("assertBoolean validates booleans", () => {
    expect(assertBoolean(true, "x")).toBe(true);
    expect(assertBoolean(false, "x")).toBe(false);
    // @ts-expect-error runtime validation path for untrusted input
    expect(() => assertBoolean("true", "x")).toThrow("x must be a boolean");
  });
});
