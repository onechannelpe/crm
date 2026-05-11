import type {
  ModalidadCobro,
  VenueDigitalConfig,
} from "~/workflow/contracts/lead-schema";

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

function toVenueDigitalConfig(input: {
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | "";
}): VenueDigitalConfig | undefined {
  const config: VenueDigitalConfig = {};

  if (input.linkUrl) {
    config.linkUrl = input.linkUrl;
  }
  if (input.onlineUrl) {
    config.onlineUrl = input.onlineUrl;
  }
  if (input.onlineModalidad) {
    config.onlineModalidad = input.onlineModalidad;
  }

  return Object.keys(config).length > 0 ? config : undefined;
}

export type BuildVenueSubmitResult =
  | { ok: true; value: VenueSubmitInput }
  | { ok: false; error: string };

export function buildVenueSubmitInput(
  form: VenueFormState,
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

  const modalidad = form.onlineModalidad();
  const linkUrl = form.linkUrl().trim() || null;
  const onlineUrl = form.onlineUrl().trim() || null;
  const digitalConfig = toVenueDigitalConfig({
    linkUrl,
    onlineUrl,
    onlineModalidad: modalidad,
  });

  const value: VenueSubmitInput = {
    nombreComercial: form.nombreComercial().trim(),
    posQuantity: posQty,
    direccion: form.direccion().trim(),
    referencia: form.referencia().trim(),
    distrito: form.distrito().trim(),
    provincia: form.provincia().trim(),
    departamento: form.departamento().trim(),
  };
  if (digitalConfig) {
    value.digitalConfig = digitalConfig;
  }

  return {
    ok: true,
    value,
  };
}
