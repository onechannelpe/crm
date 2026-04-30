import { createMemo, createSignal } from "solid-js";

import {
  isBcpBank,
  type AbonoBank,
  type AccountTypeKind,
} from "~/workflow/contracts/lead-schema";

export function useSedesFormState() {
  const [nombreComercial, setNombreComercial] = createSignal("");
  const [cantidadPos, setCantidadPos] = createSignal("1");
  const [direccion, setDireccion] = createSignal("");
  const [referencia, setReferencia] = createSignal("");
  const [distrito, setDistrito] = createSignal("");
  const [provincia, setProvincia] = createSignal("");
  const [departamento, setDepartamento] = createSignal("");

  const [bancoSoles, setBancoSoles] = createSignal<AbonoBank | "">("");
  const [showBancoSolesPicker, setShowBancoSolesPicker] = createSignal(false);
  const [tipoCuentaSoles, setTipoCuentaSoles] = createSignal<
    AccountTypeKind | ""
  >("");
  const [nroCuentaSoles, setNroCuentaSoles] = createSignal("");
  const [cciSoles, setCciSoles] = createSignal("");

  const [usarDolares, setUsarDolares] = createSignal(false);
  const [bancoDolares, setBancoDolares] = createSignal<AbonoBank | "">("");
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
    setNombreComercial("");
    setCantidadPos("1");
    setDireccion("");
    setReferencia("");
    setDistrito("");
    setProvincia("");
    setDepartamento("");
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
    nombreComercial,
    setNombreComercial,
    cantidadPos,
    setCantidadPos,
    direccion,
    setDireccion,
    referencia,
    setReferencia,
    distrito,
    setDistrito,
    provincia,
    setProvincia,
    departamento,
    setDepartamento,
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

export type SedesFormState = ReturnType<typeof useSedesFormState>;
