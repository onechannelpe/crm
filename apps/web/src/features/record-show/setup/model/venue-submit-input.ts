import { type VenueDigitalConfig } from "~/contracts/workflow/primitives";
import { type ProductScope } from "~/contracts/workflow/vocabulary";

import type { VenueFormState } from "./venue-form-state";

type VenueSubmitInput = {
  tradeName: string;
  posQuantity: number;
  digitalConfig?: VenueDigitalConfig;
  address: string;
  addressReference: string;
  district: string;
  province: string;
  department: string;
};

export type BuildVenueSubmitResult =
  | { ok: true; value: VenueSubmitInput }
  | { ok: false; error: string };

export function buildVenueSubmitInput(
  form: VenueFormState,
  policy: { linkScope: ProductScope; onlineScope: ProductScope },
): BuildVenueSubmitResult {
  const posQty = Number(form.posQuantity());

  if (!form.tradeName().trim() || !form.address().trim()) {
    return {
      ok: false,
      error: "Nombre comercial y direccion son obligatorios",
    };
  }
  if (!form.addressReference().trim()) {
    return { ok: false, error: "Referencia es obligatoria" };
  }
  if (
    !form.district().trim() ||
    !form.province().trim() ||
    !form.department().trim()
  ) {
    return {
      ok: false,
      error: "Distrito, provincia y departamento son obligatorios",
    };
  }
  if (!Number.isFinite(posQty) || posQty <= 0) {
    return { ok: false, error: "Cantidad POS debe ser mayor a 0" };
  }

  const linkUrl =
    policy.linkScope === "per_venue" ? form.linkUrl().trim() || null : null;
  const onlineUrl =
    policy.onlineScope === "per_venue" ? form.onlineUrl().trim() || null : null;
  const onlineCollectionMode =
    policy.onlineScope === "per_venue"
      ? form.onlineCollectionMode() || null
      : null;

  if (policy.linkScope === "per_venue" && !linkUrl) {
    return { ok: false, error: "URL Culqi Link es requerida" };
  }
  if (policy.onlineScope === "per_venue" && !onlineUrl) {
    return { ok: false, error: "URL Culqi Online es requerida" };
  }
  if (
    policy.onlineScope === "per_venue" &&
    onlineUrl &&
    !onlineCollectionMode
  ) {
    return { ok: false, error: "Modalidad de cobro es requerida" };
  }

  const digitalConfig: VenueDigitalConfig | undefined =
    linkUrl || onlineUrl
      ? {
          ...(linkUrl ? { linkUrl } : {}),
          ...(onlineUrl ? { onlineUrl } : {}),
          ...(onlineCollectionMode ? { onlineCollectionMode } : {}),
        }
      : undefined;

  return {
    ok: true,
    value: {
      tradeName: form.tradeName().trim(),
      posQuantity: posQty,
      digitalConfig,
      address: form.address().trim(),
      addressReference: form.addressReference().trim(),
      district: form.district().trim(),
      province: form.province().trim(),
      department: form.department().trim(),
    },
  };
}
