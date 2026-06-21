import { describe, expect, it } from "vitest";

import { parseObject, validationFail } from "~/server/shared/parsing";

function expectErrCode(
  result:
    | { ok: true; value: unknown }
    | { ok: false; error: { code: string | null } },
  code: string,
) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected err");
  expect(result.error.code).toBe(code);
}

describe("parseObject", () => {
  it("trims string values", () => {
    const result = parseObject(
      { reason: "  Reviewed by executive  " },
      validationFail,
      (r) => ({ reason: r.str("reason") }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.reason).toBe("Reviewed by executive");
  });

  it("derives a required code from the field name", () => {
    const result = parseObject({}, validationFail, (r) => ({
      reason: r.str("reason"),
    }));

    expectErrCode(result, "reason_required");
  });

  it("reports a non-finite number as invalid, not missing", () => {
    const result = parseObject(
      { tasaActual: Number.NaN },
      validationFail,
      (r) => ({ tasaActual: r.num("tasaActual") }),
    );

    expectErrCode(result, "invalid_tasa_actual");
  });

  it.each([0, -1, 1.5, Number.NaN])(
    "reports %s as an invalid positive integer",
    (amount) => {
      const result = parseObject({ amount }, validationFail, (r) => ({
        amount: r.posInt("amount"),
      }));

      expectErrCode(result, "invalid_amount");
    },
  );

  it("accepts a positive integer", () => {
    const result = parseObject({ amount: 1 }, validationFail, (r) => ({
      amount: r.posInt("amount"),
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.amount).toBe(1);
  });

  it("reports a present wrong-typed field as invalid", () => {
    const result = parseObject({ reason: 42 }, validationFail, (r) => ({
      reason: r.str("reason"),
    }));

    expectErrCode(result, "invalid_reason");
  });

  it("reports a missing required enum as required", () => {
    const result = parseObject({}, validationFail, (r) => ({
      status: r.enum("status", ["OPEN", "CLOSED"] as const),
    }));

    expectErrCode(result, "status_required");
  });

  it("reports a missing nested object on its own path", () => {
    const result = parseObject({}, validationFail, (r) => ({
      solesAccount: r.obj("solesAccount", (a) => ({
        nroCuenta: a.str("nroCuenta"),
      })),
    }));

    expectErrCode(result, "soles_account_required");
  });

  it("derives a dotted snake_case code for a nested field", () => {
    const result = parseObject(
      { dollarAccount: { isSettlement: false } },
      validationFail,
      (r) => ({
        dollarAccount: r.optObj("dollarAccount", (a) => ({
          nroCuenta: a.str("nroCuenta"),
        })),
      }),
    );

    expectErrCode(result, "dollar_account_nro_cuenta_required");
  });

  it("reports a non-object root as invalid_input", () => {
    const result = parseObject(null, validationFail, (r) => ({
      reason: r.str("reason"),
    }));

    expectErrCode(result, "invalid_input");
  });

  it("reports a list below its minimum as required", () => {
    const result = parseObject({ tags: [] }, validationFail, (r) => ({
      tags: r.strList("tags", { min: 1 }),
    }));

    expectErrCode(result, "tags_required");
  });

  it.each([
    { tags: ["one", "two"], options: { max: 1 } },
    { tags: ["one", "one"], options: { unique: true } },
    { tags: ["one", "  "], options: {} },
  ])("reports malformed string lists as invalid", ({ tags, options }) => {
    const result = parseObject({ tags }, validationFail, (r) => ({
      tags: r.strList("tags", options),
    }));

    expectErrCode(result, "invalid_tags");
  });
});
