import { createSignal } from "solid-js";
import type { Accessor, Setter } from "solid-js";

import type {
  SalesRecordAddressInput,
  SalesRecordClientInput,
  SalesRecordProductInput,
} from "~/server/sales-records/application/contracts";

export interface ProductLine {
  productId: number;
  quantity: number;
}

export interface SalesRecordFormState {
  ruc: Accessor<string>;
  setRuc: Setter<string>;
  companyName: Accessor<string>;
  setCompanyName: Setter<string>;
  contactName: Accessor<string>;
  setContactName: Setter<string>;
  dni: Accessor<string>;
  setDni: Setter<string>;
  phone: Accessor<string>;
  setPhone: Setter<string>;
  installationAddress: Accessor<string>;
  setInstallationAddress: Setter<string>;
  billingAddress: Accessor<string>;
  setBillingAddress: Setter<string>;
  referenceAddress: Accessor<string>;
  setReferenceAddress: Setter<string>;
  productLines: Accessor<ProductLine[]>;
  setProductLines: Setter<ProductLine[]>;
  buildClientPayload: () => SalesRecordClientInput;
  buildAddressPayload: () => SalesRecordAddressInput[];
  buildProductPayload: () => SalesRecordProductInput[];
  /** Returns first validation error message, or null if valid. */
  validateForSubmit: () => string | null;
}

export function useSalesRecordForm(): SalesRecordFormState {
  const [ruc, setRuc] = createSignal("");
  const [companyName, setCompanyName] = createSignal("");
  const [contactName, setContactName] = createSignal("");
  const [dni, setDni] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [installationAddress, setInstallationAddress] = createSignal("");
  const [billingAddress, setBillingAddress] = createSignal("");
  const [referenceAddress, setReferenceAddress] = createSignal("");
  const [productLines, setProductLines] = createSignal<ProductLine[]>([]);

  function buildClientPayload(): SalesRecordClientInput {
    return {
      ruc: ruc().trim() || null,
      companyName: companyName().trim(),
      contactName: contactName().trim(),
      dni: dni().trim(),
      phones: phone().trim() ? [phone().trim()] : [],
      engineMatchId: null,
      completenessScore: 0,
    };
  }

  function buildAddressPayload(): SalesRecordAddressInput[] {
    const addresses: SalesRecordAddressInput[] = [
      {
        addressType: "installation",
        fullText: installationAddress().trim(),
        department: null,
        province: null,
        district: null,
        ubigeo: null,
        latitude: null,
        longitude: null,
        isPrimary: true,
      },
    ];

    if (billingAddress().trim()) {
      addresses.push({
        addressType: "billing",
        fullText: billingAddress().trim(),
        department: null,
        province: null,
        district: null,
        ubigeo: null,
        latitude: null,
        longitude: null,
        isPrimary: false,
      });
    }

    if (referenceAddress().trim()) {
      addresses.push({
        addressType: "reference",
        fullText: referenceAddress().trim(),
        department: null,
        province: null,
        district: null,
        ubigeo: null,
        latitude: null,
        longitude: null,
        isPrimary: false,
      });
    }

    return addresses;
  }

  function buildProductPayload(): SalesRecordProductInput[] {
    return productLines().map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    }));
  }

  function validateForSubmit(): string | null {
    if (!companyName().trim() || !contactName().trim() || !dni().trim()) {
      return "Empresa, contacto y DNI son obligatorios";
    }
    if (!installationAddress().trim()) {
      return "La dirección de instalación es obligatoria";
    }
    if (productLines().length < 1) {
      return "Se requiere al menos un producto";
    }
    return null;
  }

  return {
    ruc,
    setRuc,
    companyName,
    setCompanyName,
    contactName,
    setContactName,
    dni,
    setDni,
    phone,
    setPhone,
    installationAddress,
    setInstallationAddress,
    billingAddress,
    setBillingAddress,
    referenceAddress,
    setReferenceAddress,
    productLines,
    setProductLines,
    buildClientPayload,
    buildAddressPayload,
    buildProductPayload,
    validateForSubmit,
  };
}
