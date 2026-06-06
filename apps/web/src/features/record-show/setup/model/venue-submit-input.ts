import { type VenueDigitalConfig } from "~/contracts/workflow/primitives";
import { type ProductScope } from "~/contracts/workflow/vocabulary";

import type { VenueFormState } from "./venue-form-state";

type VenueSubmitInput = {
  nombreComercial: string;
  posQuantity: number;
  digitalConfig?: VenueDigitalConfig;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
};

export type BuildVenueSubmitResult =
  | { ok: true; value: VenueSubmitInput }
  | { ok: false; error: string };

export function buildVenueSubmitInput(
  form: VenueFormState,
  policy: { linkScope: ProductScope; onlineScope: ProductScope },
): BuildVenueSubmitResult {
  const posQty = Number(form.posQuantity());

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
  if (!Number.isFinite(posQty) || posQty <= 0) {
    return { ok: false, error: "Cantidad POS debe ser mayor a 0" };
  }

  const linkUrl =
    policy.linkScope === "per_venue" ? form.linkUrl().trim() || null : null;
  const onlineUrl =
    policy.onlineScope === "per_venue" ? form.onlineUrl().trim() || null : null;
  const onlineModalidad =
    policy.onlineScope === "per_venue" ? form.onlineModalidad() || null : null;

  if (policy.linkScope === "per_venue" && !linkUrl) {
    return { ok: false, error: "URL Culqi Link es requerida" };
  }
  if (policy.onlineScope === "per_venue" && !onlineUrl) {
    return { ok: false, error: "URL Culqi Online es requerida" };
  }
  if (policy.onlineScope === "per_venue" && onlineUrl && !onlineModalidad) {
    return { ok: false, error: "Modalidad de cobro es requerida" };
  }

  const digitalConfig: VenueDigitalConfig | undefined =
    linkUrl || onlineUrl
      ? {
          ...(linkUrl ? { linkUrl } : {}),
          ...(onlineUrl ? { onlineUrl } : {}),
          ...(onlineModalidad ? { onlineModalidad } : {}),
        }
      : undefined;

  return {
    ok: true,
    value: {
      nombreComercial: form.nombreComercial().trim(),
      posQuantity: posQty,
      digitalConfig,
      direccion: form.direccion().trim(),
      referencia: form.referencia().trim(),
      distrito: form.distrito().trim(),
      provincia: form.provincia().trim(),
      departamento: form.departamento().trim(),
    },
  };
}
