import { describe, expect, it } from "vitest";

import { assertNonEmptyString, assertPositiveInt } from "~/contracts/guards";
import { parseWireError } from "~/lib/wire-error";

function expectValidationCode(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (error) {
    expect(parseWireError(error)).toEqual({
      kind: "validation",
      code,
      message: "Revisa los datos ingresados.",
    });
    return;
  }

  throw new Error("Expected guard to throw");
}

describe("contracts guards", () => {
  it("assertPositiveInt accepts positive integers", () => {
    expect(assertPositiveInt(1, "x")).toBe(1);
    expect(assertPositiveInt(42, "x")).toBe(42);
  });

  it("assertPositiveInt rejects invalid integers", () => {
    expectValidationCode(() => assertPositiveInt(0, "x"), "x_positive_integer");
    expectValidationCode(
      () => assertPositiveInt(-1, "x"),
      "x_positive_integer",
    );
    expectValidationCode(
      () => assertPositiveInt(1.5, "x"),
      "x_positive_integer",
    );
    expectValidationCode(
      () => assertPositiveInt(Number.NaN, "x"),
      "x_positive_integer",
    );
  });

  it("assertNonEmptyString trims and validates", () => {
    expect(assertNonEmptyString("  ok  ", "x")).toBe("ok");
    expectValidationCode(() => assertNonEmptyString("   ", "x"), "x_required");
  });
});
