import type {
  AbonoBank,
  AccountTypeKind,
} from "~/workflow/contracts/lead-schema";

import type { SedesFormState } from "./form-state";

type SubmitInput = {
  nombreComercial: string;
  cantidadPos: number;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
  solesAccount: {
    currency: "PEN";
    banco: AbonoBank;
    tipoCuenta: AccountTypeKind;
    nroCuenta: string;
    cci?: string;
    isSettlement: boolean;
  };
  dollarAccount?: {
    currency: "USD";
    banco: AbonoBank;
    tipoCuenta: AccountTypeKind;
    nroCuenta: string;
    cci?: string;
    isSettlement: boolean;
  };
};

export type BuildSubmitInputResult =
  | { ok: true; value: SubmitInput }
  | { ok: false; error: string };

export function buildSubmitInput(form: SedesFormState): BuildSubmitInputResult {
  const currentBancoSoles = form.bancoSoles();
  const currentTipoCuentaSoles = form.tipoCuentaSoles();
  const cantidadPosValue = Number(form.cantidadPos());

  if (!form.nombreComercial().trim() || !form.direccion().trim()) {
    return {
      ok: false,
      error: "Nombre comercial y direccion son obligatorios",
    };
  }
  if (!form.referencia().trim()) {
    return { ok: false, error: "Referencia es obligatoria" };
  }
  if (
    !form.distrito().trim() ||
    !form.provincia().trim() ||
    !form.departamento().trim()
  ) {
    return {
      ok: false,
      error: "Distrito, provincia y departamento son obligatorios",
    };
  }
  if (!Number.isFinite(cantidadPosValue) || cantidadPosValue <= 0) {
    return { ok: false, error: "Cantidad POS debe ser mayor a 0" };
  }
  if (
    !currentBancoSoles ||
    !currentTipoCuentaSoles ||
    !form.nroCuentaSoles().trim()
  ) {
    return { ok: false, error: "Completa todos los datos de cuenta en soles" };
  }
  if (form.requiresCciSoles() && !form.cciSoles().trim()) {
    return {
      ok: false,
      error: "CCI en soles es obligatorio cuando el banco no es BCP",
    };
  }

  const solesAccount = {
    currency: "PEN" as const,
    banco: currentBancoSoles,
    tipoCuenta: currentTipoCuentaSoles,
    nroCuenta: form.nroCuentaSoles().trim(),
    ...(form.cciSoles().trim() ? { cci: form.cciSoles().trim() } : {}),
    isSettlement: form.settlementCurrency() === "PEN",
  };

  let dollarAccount:
    | {
        currency: "USD";
        banco: AbonoBank;
        tipoCuenta: AccountTypeKind;
        nroCuenta: string;
        cci?: string;
        isSettlement: boolean;
      }
    | undefined;

  if (form.usarDolares()) {
    const currentBancoDolares = form.bancoDolares();
    const currentTipoCuentaDolares = form.tipoCuentaDolares();

    if (
      !currentBancoDolares ||
      !currentTipoCuentaDolares ||
      !form.nroCuentaDolares().trim()
    ) {
      return {
        ok: false,
        error: "Completa todos los datos de cuenta en dolares",
      };
    }
    if (form.requiresCciDolares() && !form.cciDolares().trim()) {
      return {
        ok: false,
        error: "CCI en dolares es obligatorio cuando el banco no es BCP",
      };
    }

    dollarAccount = {
      currency: "USD" as const,
      banco: currentBancoDolares,
      tipoCuenta: currentTipoCuentaDolares,
      nroCuenta: form.nroCuentaDolares().trim(),
      ...(form.cciDolares().trim() ? { cci: form.cciDolares().trim() } : {}),
      isSettlement: form.settlementCurrency() === "USD",
    };
  }

  return {
    ok: true,
    value: {
      nombreComercial: form.nombreComercial().trim(),
      cantidadPos: cantidadPosValue,
      direccion: form.direccion().trim(),
      referencia: form.referencia().trim(),
      distrito: form.distrito().trim(),
      provincia: form.provincia().trim(),
      departamento: form.departamento().trim(),
      solesAccount,
      dollarAccount,
    },
  };
}
