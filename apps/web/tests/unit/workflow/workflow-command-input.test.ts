import { describe, expect, it } from "vitest";

import {
  parseAddVenueAccountsInput,
  parseLeadReviewInput,
  parseRecordRepLegalInput,
  parseSaveCommercialScopeInput,
} from "~/actions/workflow/commands/input";

function expectErrCode(
  result: { ok: true; value: unknown } | { ok: false; error: { code: string } },
  code: string,
) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected err");
  expect(result.error.code).toBe(code);
}

describe("workflow command input parsing", () => {
  it("normalizes lead review values before command execution", () => {
    const result = parseLeadReviewInput({
      leadId: "lead-1",
      status: "DISPONIBLE",
      prioridad: "P1",
      reason: "  Reviewed by executive  ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.reason).toBe("Reviewed by executive");
  });

  it("rejects missing lead review reason without throwing", () => {
    const result = parseLeadReviewInput({
      leadId: "lead-1",
      status: "DISPONIBLE",
      prioridad: "P1",
    });

    expectErrCode(result, "reason_required");
  });

  it("rejects missing legal representative fields without throwing", () => {
    const result = parseRecordRepLegalInput({
      leadId: "lead-1",
      nombres: "Ana",
      apellidoPaterno: "Perez",
      apellidoMaterno: "Gomez",
      dni: undefined,
      telefono: "999999999",
      email: "ana@example.com",
    });

    expectErrCode(result, "dni_required");
  });

  it("rejects invalid commercial scope numbers", () => {
    const result = parseSaveCommercialScopeInput({
      leadId: "lead-1",
      proveedorActual: "Procesador",
      tasaActual: Number.NaN,
      gpv: 100,
      ticket: 10,
      giroNegocio: "Restaurante",
      abonoBank: "BCP",
      posTotal: 1,
    });

    expectErrCode(result, "tasa_actual_required");
  });

  it("validates soles account before reading nested account fields", () => {
    const result = parseAddVenueAccountsInput({
      leadId: "lead-1",
      venueId: "venue-1",
    });

    expectErrCode(result, "soles_account_required");
  });

  it("rejects a present dollar account without an account number", () => {
    const result = parseAddVenueAccountsInput({
      leadId: "lead-1",
      venueId: "venue-1",
      solesAccount: {
        currency: "PEN",
        banco: "BCP",
        tipoCuenta: "AHORROS",
        nroCuenta: "123",
        isSettlement: true,
      },
      dollarAccount: {
        currency: "USD",
        banco: "BCP",
        tipoCuenta: "CORRIENTE",
        isSettlement: false,
      },
    });

    expectErrCode(result, "dollar_account_number_required");
  });

  it("requires CCI for non-BCP accounts", () => {
    const result = parseAddVenueAccountsInput({
      leadId: "lead-1",
      venueId: "venue-1",
      solesAccount: {
        currency: "PEN",
        banco: "BBVA",
        tipoCuenta: "AHORROS",
        nroCuenta: "123",
        isSettlement: true,
      },
    });

    expectErrCode(result, "soles_account_cci_required");
  });
});
