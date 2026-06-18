import { createMemo, createSignal } from "solid-js";

import {
  isBcpBank,
  type SettlementBank,
  type AccountTypeKind,
} from "~/contracts/workflow/vocabulary";

export function useAccountsFormState() {
  const [bancoSoles, setBancoSoles] = createSignal<SettlementBank | "">("");
  const [showBancoSolesPicker, setShowBancoSolesPicker] = createSignal(false);
  const [tipoCuentaSoles, setTipoCuentaSoles] = createSignal<
    AccountTypeKind | ""
  >("");
  const [nroCuentaSoles, setNroCuentaSoles] = createSignal("");
  const [cciSoles, setCciSoles] = createSignal("");

  const [usarDolares, setUsarDolares] = createSignal(false);
  const [bancoDolares, setBancoDolares] = createSignal<SettlementBank | "">("");
  const [showBancoDolaresPicker, setShowBancoDolaresPicker] =
    createSignal(false);
  const [tipoCuentaDolares, setTipoCuentaDolares] = createSignal<
    AccountTypeKind | ""
  >("");
  const [nroCuentaDolares, setNroCuentaDolares] = createSignal("");
  const [cciDolares, setCciDolares] = createSignal("");

  const [settlementCurrency, setSettlementCurrency] = createSignal<
    "PEN" | "USD"
  >("PEN");

  const requiresCciSoles = createMemo(() =>
    bancoSoles() ? !isBcpBank(bancoSoles()) : false,
  );
  const requiresCciDolares = createMemo(() =>
    bancoDolares() ? !isBcpBank(bancoDolares()) : false,
  );

  function reset() {
    setBancoSoles("");
    setTipoCuentaSoles("");
    setNroCuentaSoles("");
    setCciSoles("");
    setUsarDolares(false);
    setBancoDolares("");
    setTipoCuentaDolares("");
    setNroCuentaDolares("");
    setCciDolares("");
    setSettlementCurrency("PEN");
  }

  return {
    bancoSoles,
    setBancoSoles,
    showBancoSolesPicker,
    setShowBancoSolesPicker,
    tipoCuentaSoles,
    setTipoCuentaSoles,
    nroCuentaSoles,
    setNroCuentaSoles,
    cciSoles,
    setCciSoles,
    usarDolares,
    setUsarDolares,
    bancoDolares,
    setBancoDolares,
    showBancoDolaresPicker,
    setShowBancoDolaresPicker,
    tipoCuentaDolares,
    setTipoCuentaDolares,
    nroCuentaDolares,
    setNroCuentaDolares,
    cciDolares,
    setCciDolares,
    settlementCurrency,
    setSettlementCurrency,
    requiresCciSoles,
    requiresCciDolares,
    reset,
  };
}

export type AccountsFormState = ReturnType<typeof useAccountsFormState>;
