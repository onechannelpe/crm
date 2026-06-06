import type { DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";
import { parseRequiredLeadText } from "~/server/workflow/parsers";

export type VenueTextFields = {
  nombreComercial: string;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
};

// Single owner for the required venue text fields, shared by create and update
// so the contract is defined once. Returns trimmed values for persistence.
export function parseVenueTextFields(
  input: VenueTextFields,
): Result<VenueTextFields, DomainError> {
  const nombreComercial = parseRequiredLeadText(
    input.nombreComercial,
    "nombre_comercial_required",
    "Nombre comercial is required",
  );
  if (isErr(nombreComercial)) return nombreComercial;

  const direccion = parseRequiredLeadText(
    input.direccion,
    "direccion_required",
    "Direccion is required",
  );
  if (isErr(direccion)) return direccion;

  const referencia = parseRequiredLeadText(
    input.referencia,
    "referencia_required",
    "Referencia is required",
  );
  if (isErr(referencia)) return referencia;

  const distrito = parseRequiredLeadText(
    input.distrito,
    "distrito_required",
    "Distrito is required",
  );
  if (isErr(distrito)) return distrito;

  const provincia = parseRequiredLeadText(
    input.provincia,
    "provincia_required",
    "Provincia is required",
  );
  if (isErr(provincia)) return provincia;

  const departamento = parseRequiredLeadText(
    input.departamento,
    "departamento_required",
    "Departamento is required",
  );
  if (isErr(departamento)) return departamento;

  return Ok({
    nombreComercial: nombreComercial.value,
    direccion: direccion.value,
    referencia: referencia.value,
    distrito: distrito.value,
    provincia: provincia.value,
    departamento: departamento.value,
  });
}
