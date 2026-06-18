import { createSignal } from "solid-js";

import type { CollectionMode } from "~/contracts/workflow/vocabulary";

export type VenueFormValues = {
  nombreComercial: string;
  posQuantity: string;
  linkUrl: string;
  onlineUrl: string;
  onlineCollectionMode: CollectionMode | "";
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
};

const EMPTY_VENUE_FORM_VALUES: VenueFormValues = {
  nombreComercial: "",
  posQuantity: "1",
  linkUrl: "",
  onlineUrl: "",
  onlineCollectionMode: "",
  direccion: "",
  referencia: "",
  distrito: "",
  provincia: "",
  departamento: "",
};

export function useVenueFormState(initialValues?: VenueFormValues) {
  const initial = initialValues ?? EMPTY_VENUE_FORM_VALUES;
  const [nombreComercial, setNombreComercial] = createSignal(
    initial.nombreComercial,
  );
  const [posQuantity, setPosQuantity] = createSignal(initial.posQuantity);
  const [linkUrl, setLinkUrl] = createSignal(initial.linkUrl);
  const [onlineUrl, setOnlineUrl] = createSignal(initial.onlineUrl);
  const [onlineCollectionMode, setOnlineCollectionMode] = createSignal<
    CollectionMode | ""
  >(initial.onlineCollectionMode);
  const [direccion, setDireccion] = createSignal(initial.direccion);
  const [referencia, setReferencia] = createSignal(initial.referencia);
  const [distrito, setDistrito] = createSignal(initial.distrito);
  const [provincia, setProvincia] = createSignal(initial.provincia);
  const [departamento, setDepartamento] = createSignal(initial.departamento);

  function reset(values: VenueFormValues = EMPTY_VENUE_FORM_VALUES) {
    setNombreComercial(values.nombreComercial);
    setPosQuantity(values.posQuantity);
    setLinkUrl(values.linkUrl);
    setOnlineUrl(values.onlineUrl);
    setOnlineCollectionMode(values.onlineCollectionMode);
    setDireccion(values.direccion);
    setReferencia(values.referencia);
    setDistrito(values.distrito);
    setProvincia(values.provincia);
    setDepartamento(values.departamento);
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
    onlineCollectionMode,
    setOnlineCollectionMode,
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
