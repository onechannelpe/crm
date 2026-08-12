import { describe, expect, it } from "vitest";

import type { SaleVenueAccount } from "~/contracts/workflow/primitives";
import { buildVenueAccounts } from "~/server/workflow/lead/venue/domain";

function soles(overrides: Partial<Omit<SaleVenueAccount, "currency">> = {}) {
  return {
    currency: "PEN",
    banco: "BCP",
    tipoCuenta: "AHORROS",
    nroCuenta: "123",
    isSettlement: true,
    ...overrides,
  } satisfies SaleVenueAccount & { currency: "PEN" };
}

function dolares(overrides: Partial<Omit<SaleVenueAccount, "currency">> = {}) {
  return {
    currency: "USD",
    banco: "BCP",
    tipoCuenta: "CORRIENTE",
    nroCuenta: "456",
    isSettlement: false,
    ...overrides,
  } satisfies SaleVenueAccount & { currency: "USD" };
}

describe("buildVenueAccounts", () => {
  it("requires exactly one settlement account", () => {
    const result = buildVenueAccounts({
      solesAccount: soles({ isSettlement: false }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected err");
    }
    expect(result.error.code).toBe("invalid_settlement_account");
  });

  it("rejects two settlement accounts", () => {
    const result = buildVenueAccounts({
      solesAccount: soles({ isSettlement: true }),
      dollarAccount: dolares({ isSettlement: true }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected err");
    }
    expect(result.error.code).toBe("invalid_settlement_account");
  });

  it("requires CCI for a non-BCP soles account", () => {
    const result = buildVenueAccounts({
      solesAccount: soles({ banco: "BBVA" }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected err");
    }
    expect(result.error.code).toBe("missing_cci_soles");
  });

  it("requires CCI for a non-BCP dollar account", () => {
    const result = buildVenueAccounts({
      solesAccount: soles({ isSettlement: true }),
      dollarAccount: dolares({ banco: "BBVA" }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected err");
    }
    expect(result.error.code).toBe("missing_cci_dolares");
  });

  it("drops CCI for a BCP account", () => {
    const result = buildVenueAccounts({
      solesAccount: soles({ cci: "00212345678901234567" }),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected ok");
    }
    expect(result.value.solesAccount.cci).toBeUndefined();
  });

  it("keeps CCI for a non-BCP account", () => {
    const result = buildVenueAccounts({
      solesAccount: soles({ banco: "BBVA", cci: "00212345678901234567" }),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected ok");
    }
    expect(result.value.solesAccount.cci).toBe("00212345678901234567");
  });
});
