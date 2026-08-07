import type { CommercialScope } from "~/contracts/workflow/inputs";
import { MIN_GPV } from "~/contracts/workflow/limits";
import {
  SETTLEMENT_BANKS,
  type SettlementBank,
} from "~/contracts/workflow/vocabulary";

type ProjectionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type CommercialScopeFormValues = {
  currentProvider: string;
  currentDebitRate: string;
  currentCreditRate: string;
  gpv: string;
  ticket: string;
  lineOfBusiness: string;
  settlementBank: SettlementBank | "";
  posCount: string;
};

export const EMPTY_COMMERCIAL_SCOPE_VALUES: CommercialScopeFormValues = {
  currentProvider: "",
  currentDebitRate: "",
  currentCreditRate: "",
  gpv: "",
  ticket: "",
  lineOfBusiness: "",
  settlementBank: "",
  posCount: "",
};

function isAtLeast(value: string, min: number): boolean {
  const parsed = Number(value);

  return value.trim() !== "" && Number.isFinite(parsed) && parsed >= min;
}

function isPositiveInteger(value: string): boolean {
  const parsed = Number(value);

  return value.trim() !== "" && Number.isInteger(parsed) && parsed >= 1;
}

export function toCommercialScopePayload(
  values: CommercialScopeFormValues,
): ProjectionResult<CommercialScope> {
  if (!values.currentProvider.trim()) {
    return { ok: false, error: "Proveedor actual es requerido" };
  }

  if (!isAtLeast(values.currentDebitRate, 0)) {
    return { ok: false, error: "Tasa débito actual es requerida" };
  }

  if (!isAtLeast(values.currentCreditRate, 0)) {
    return { ok: false, error: "Tasa crédito actual es requerida" };
  }

  if (!isAtLeast(values.gpv, MIN_GPV)) {
    return { ok: false, error: `GPV debe ser al menos ${MIN_GPV}` };
  }

  if (!isAtLeast(values.ticket, 0)) {
    return { ok: false, error: "Ticket es requerido" };
  }

  if (!values.lineOfBusiness.trim()) {
    return { ok: false, error: "Giro de negocio es requerido" };
  }

  if (!values.settlementBank) {
    return { ok: false, error: "Banco de abono es requerido" };
  }

  if (!isPositiveInteger(values.posCount)) {
    return {
      ok: false,
      error: "Cantidad de POS debe ser un entero mayor a 0",
    };
  }

  return {
    ok: true,
    value: {
      currentProvider: values.currentProvider.trim(),
      currentDebitRate: Number(values.currentDebitRate),
      currentCreditRate: Number(values.currentCreditRate),
      gpv: Number(values.gpv),
      ticket: Number(values.ticket),
      lineOfBusiness: values.lineOfBusiness.trim(),
      settlementBank: values.settlementBank,
      posCount: Number(values.posCount),
    },
  };
}

export function coerceSettlementBank(value: string): SettlementBank | "" {
  return SETTLEMENT_BANKS.find((bank) => bank === value) ?? "";
}
