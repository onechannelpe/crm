import type { CommercialScope } from "~/contracts/workflow/inputs";
import {
  SETTLEMENT_BANKS,
  type SettlementBank,
} from "~/contracts/workflow/vocabulary";

type ProjectionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// Form fields stay strings until submit so text, number, and select inputs share
// one editable shape.
export type CommercialScopePayload = CommercialScope;

export type CommercialScopeFormValues = {
  currentProvider: string;
  currentDebitRate: string;
  currentCreditRate: string;
  gpv: string;
  ticket: string;
  giroNegocio: string;
  settlementBank: SettlementBank | "";
  posCount: string;
};

export const EMPTY_COMMERCIAL_SCOPE_VALUES: CommercialScopeFormValues = {
  currentProvider: "",
  currentDebitRate: "",
  currentCreditRate: "",
  gpv: "",
  ticket: "",
  giroNegocio: "",
  settlementBank: "",
  posCount: "",
};

function isNonNegativeNumber(value: string): boolean {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
}

function validateCommercialScope(
  values: CommercialScopeFormValues,
): string | null {
  if (!values.currentProvider.trim()) return "Proveedor actual es requerido";
  if (!isNonNegativeNumber(values.currentDebitRate))
    return "Tasa débito actual es requerida";
  if (!isNonNegativeNumber(values.currentCreditRate))
    return "Tasa crédito actual es requerida";
  if (!isNonNegativeNumber(values.gpv)) return "GPV es requerido";
  if (!isNonNegativeNumber(values.ticket)) return "Ticket es requerido";
  if (!values.giroNegocio.trim()) return "Giro de negocio es requerido";
  if (!values.settlementBank) return "Banco de abono es requerido";
  if (!values.posCount.trim() || Number(values.posCount) <= 0)
    return "Cantidad de POS es requerida";
  return null;
}

export function toCommercialScopePayload(
  values: CommercialScopeFormValues,
): ProjectionResult<CommercialScopePayload> {
  const error = validateCommercialScope(values);
  if (error) {
    return { ok: false, error };
  }

  const bank = values.settlementBank;
  if (!bank) {
    return { ok: false, error: "Banco de abono es requerido" };
  }

  return {
    ok: true,
    value: {
      currentProvider: values.currentProvider.trim(),
      currentDebitRate: Number(values.currentDebitRate),
      currentCreditRate: Number(values.currentCreditRate),
      gpv: Number(values.gpv),
      ticket: Number(values.ticket),
      giroNegocio: values.giroNegocio.trim(),
      settlementBank: bank,
      posCount: Number(values.posCount),
    },
  };
}

export function coerceSettlementBank(value: string): SettlementBank | "" {
  return SETTLEMENT_BANKS.find((bank) => bank === value) ?? "";
}
