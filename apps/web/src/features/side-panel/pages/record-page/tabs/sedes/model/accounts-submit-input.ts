import type {
  AbonoBank,
  AccountTypeKind,
} from "~/contracts/workflow";

import type { AccountsFormState } from "./accounts-form-state";

type AccountsSubmitInput = {
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

export type BuildAccountsSubmitResult =
  | { ok: true; value: AccountsSubmitInput }
  | { ok: false; error: string };

export function buildAccountsSubmitInput(
  form: AccountsFormState,
): BuildAccountsSubmitResult {
  const currentBancoSoles = form.bancoSoles();
  const currentTipoCuentaSoles = form.tipoCuentaSoles();

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

  return { ok: true, value: { solesAccount, dollarAccount } };
}
