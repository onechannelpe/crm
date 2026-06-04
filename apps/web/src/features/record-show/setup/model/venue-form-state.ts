import { createSignal } from "solid-js";

import type { ModalidadCobro } from "~/contracts/workflow/vocabulary";

export function useVenueFormState() {
  const [nombreComercial, setNombreComercial] = createSignal("");
  const [posQuantity, setPosQuantity] = createSignal("1");
  const [linkUrl, setLinkUrl] = createSignal("");
  const [onlineUrl, setOnlineUrl] = createSignal("");
  const [onlineModalidad, setOnlineModalidad] = createSignal<
    ModalidadCobro | ""
  >("");
  const [direccion, setDireccion] = createSignal("");
  const [referencia, setReferencia] = createSignal("");
  const [distrito, setDistrito] = createSignal("");
  const [provincia, setProvincia] = createSignal("");
  const [departamento, setDepartamento] = createSignal("");

  function reset() {
    setNombreComercial("");
    setPosQuantity("1");
    setLinkUrl("");
    setOnlineUrl("");
    setOnlineModalidad("");
    setDireccion("");
    setReferencia("");
    setDistrito("");
    setProvincia("");
    setDepartamento("");
  }

  return {
    nombreComercial,
    setNombreComercial,
    posQuantity,
    setPosQuantity,
    linkUrl,
    setLinkUrl,
    onlineUrl,
    setOnlineUrl,
    onlineModalidad,
    setOnlineModalidad,
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
    reset,
  };
}

export type VenueFormState = ReturnType<typeof useVenueFormState>;
