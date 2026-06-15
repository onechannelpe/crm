import type { CommercialScope } from "~/contracts/workflow/inputs";
import { ABONO_BANKS, type AbonoBank } from "~/contracts/workflow/vocabulary";

// Form fields stay strings until submit so text, number, and select inputs share
// one editable shape.
export type CommercialScopePayload = CommercialScope;

export type CommercialScopeFormValues = {
  proveedorActual: string;
  tasaActual: string;
  gpv: string;
  ticket: string;
  giroNegocio: string;
  abonoBank: AbonoBank | "";
  posTotal: string;
};

export const EMPTY_COMMERCIAL_SCOPE_VALUES: CommercialScopeFormValues = {
  proveedorActual: "",
  tasaActual: "",
  gpv: "",
  ticket: "",
  giroNegocio: "",
  abonoBank: "",
  posTotal: "",
};

function isNonNegativeNumber(value: string): boolean {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
}

export function validateCommercialScope(
  values: CommercialScopeFormValues,
): string | null {
  if (!values.proveedorActual.trim()) return "Proveedor actual es requerido";
  if (!isNonNegativeNumber(values.tasaActual))
    return "Tasa actual es requerida";
  if (!isNonNegativeNumber(values.gpv)) return "GPV es requerido";
  if (!isNonNegativeNumber(values.ticket)) return "Ticket es requerido";
  if (!values.giroNegocio.trim()) return "Giro de negocio es requerido";
  if (!values.abonoBank) return "Banco de abono es requerido";
  if (!values.posTotal.trim() || Number(values.posTotal) <= 0)
    return "Cantidad de POS es requerida";
  return null;
}

// Callers must validate first; this assumes a non-empty bank and numeric fields.
export function toCommercialScopePayload(
  values: CommercialScopeFormValues,
): CommercialScopePayload {
  const bank = values.abonoBank;
  if (!bank) {
    throw new Error("commercial scope must be validated before projection");
  }
  return {
    proveedorActual: values.proveedorActual.trim(),
    tasaActual: Number(values.tasaActual),
    gpv: Number(values.gpv),
    ticket: Number(values.ticket),
    giroNegocio: values.giroNegocio.trim(),
    abonoBank: bank,
    posTotal: Number(values.posTotal),
  };
}

export function coerceAbonoBank(value: string): AbonoBank | "" {
  return ABONO_BANKS.find((bank) => bank === value) ?? "";
}
