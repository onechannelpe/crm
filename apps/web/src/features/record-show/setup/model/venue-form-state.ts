import { createSignal } from "solid-js";

import type { CollectionMode } from "~/contracts/workflow/vocabulary";

export type VenueFormValues = {
  tradeName: string;
  posQuantity: string;
  linkUrl: string;
  onlineUrl: string;
  onlineCollectionMode: CollectionMode | "";
  address: string;
  addressReference: string;
  district: string;
  province: string;
  department: string;
};

const EMPTY_VENUE_FORM_VALUES: VenueFormValues = {
  tradeName: "",
  posQuantity: "1",
  linkUrl: "",
  onlineUrl: "",
  onlineCollectionMode: "",
  address: "",
  addressReference: "",
  district: "",
  province: "",
  department: "",
};

export function useVenueFormState(initialValues?: VenueFormValues) {
  const initial = initialValues ?? EMPTY_VENUE_FORM_VALUES;
  const [tradeName, setTradeName] = createSignal(initial.tradeName);
  const [posQuantity, setPosQuantity] = createSignal(initial.posQuantity);
  const [linkUrl, setLinkUrl] = createSignal(initial.linkUrl);
  const [onlineUrl, setOnlineUrl] = createSignal(initial.onlineUrl);
  const [onlineCollectionMode, setOnlineCollectionMode] = createSignal<
    CollectionMode | ""
  >(initial.onlineCollectionMode);
  const [address, setAddress] = createSignal(initial.address);
  const [addressReference, setAddressReference] = createSignal(
    initial.addressReference,
  );
  const [district, setDistrict] = createSignal(initial.district);
  const [province, setProvince] = createSignal(initial.province);
  const [department, setDepartment] = createSignal(initial.department);

  function reset(values: VenueFormValues = EMPTY_VENUE_FORM_VALUES) {
    setTradeName(values.tradeName);
    setPosQuantity(values.posQuantity);
    setLinkUrl(values.linkUrl);
    setOnlineUrl(values.onlineUrl);
    setOnlineCollectionMode(values.onlineCollectionMode);
    setAddress(values.address);
    setAddressReference(values.addressReference);
    setDistrict(values.district);
    setProvince(values.province);
    setDepartment(values.department);
  }

  return {
    tradeName,
    setTradeName,
    posQuantity,
    setPosQuantity,
    linkUrl,
    setLinkUrl,
    onlineUrl,
    setOnlineUrl,
    onlineCollectionMode,
    setOnlineCollectionMode,
    address,
    setAddress,
    addressReference,
    setAddressReference,
    district,
    setDistrict,
    province,
    setProvince,
    department,
    setDepartment,
    reset,
  };
}

export type VenueFormState = ReturnType<typeof useVenueFormState>;
