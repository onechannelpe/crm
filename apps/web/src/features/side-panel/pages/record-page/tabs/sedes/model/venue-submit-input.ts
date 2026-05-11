import type { ModalidadCobro } from "~/workflow/contracts/lead-schema";

import type { VenueFormState } from "./venue-form-state";

type VenueSubmitInput = {
  nombreComercial: string;
  posQuantity: number;
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
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
): BuildVenueSubmitResult {
  const posQty = Number(form.posQuantity());

  if (!form.nombreComercial().trim() || !form.direccion().trim()) {
    return { ok: false, error: "Nombre comercial y direccion son obligatorios" };
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

  return {
    ok: true,
    value: {
      nombreComercial: form.nombreComercial().trim(),
      posQuantity: posQty,
      linkUrl: form.linkUrl().trim() || null,
      onlineUrl: form.onlineUrl().trim() || null,
      onlineModalidad: modalidad || null,
      direccion: form.direccion().trim(),
      referencia: form.referencia().trim(),
      distrito: form.distrito().trim(),
      provincia: form.provincia().trim(),
      departamento: form.departamento().trim(),
    },
  };
}
