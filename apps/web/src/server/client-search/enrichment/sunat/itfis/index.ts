import { isPlainRecord } from "~/lib/type-guards";

import type { SunatDniData } from "../contracts";
import { sanitizeField } from "../text";

function firstListaEntry(
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!Array.isArray(payload.lista) || payload.lista.length < 1) return null;
  const first = payload.lista[0];
  return isPlainRecord(first) ? first : null;
}

function splitNamesFromItfisdenreg(full: string): {
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
} {
  const [lastNamesRaw, namesRaw] = full.split(",");
  const lastNames = sanitizeField(lastNamesRaw);
  const nombres = sanitizeField(namesRaw);
  if (!lastNames) {
    return { nombres, apellidoPaterno: null, apellidoMaterno: null };
  }

  const surnameParts = lastNames.split(" ").filter((part) => part.length > 0);
  if (surnameParts.length < 2) {
    return {
      nombres,
      apellidoPaterno: surnameParts[0] ?? null,
      apellidoMaterno: null,
    };
  }

  return {
    nombres,
    apellidoPaterno: surnameParts[0] ?? null,
    apellidoMaterno: surnameParts.slice(1).join(" "),
  };
}

export function readDni(dni: string, payload: unknown): SunatDniData | null {
  if (!isPlainRecord(payload)) {
    if (typeof payload === "string" && payload.trim().length > 0) {
      return {
        dni,
        nombres: null,
        apellidoPaterno: null,
        apellidoMaterno: null,
        payload,
      };
    }
    return null;
  }

  const lista = firstListaEntry(payload);
  const itfisNames = sanitizeField(lista?.nombresapellidos);
  const parsedItfis =
    typeof itfisNames === "string"
      ? splitNamesFromItfisdenreg(itfisNames)
      : {
          nombres: null,
          apellidoPaterno: null,
          apellidoMaterno: null,
        };

  const nombres =
    parsedItfis.nombres ??
    sanitizeField(payload.nombres) ??
    sanitizeField(payload.nombreSoli) ??
    sanitizeField(payload.nombre);
  const apellidoPaterno =
    parsedItfis.apellidoPaterno ??
    sanitizeField(payload.apellidoPaterno) ??
    sanitizeField(payload.apePatSoli) ??
    sanitizeField(payload.apellido_pat);
  const apellidoMaterno =
    parsedItfis.apellidoMaterno ??
    sanitizeField(payload.apellidoMaterno) ??
    sanitizeField(payload.apeMatSoli) ??
    sanitizeField(payload.apellido_mat);

  if (!nombres && !apellidoPaterno && !apellidoMaterno) return null;

  return {
    dni,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    payload,
  };
}

export function readRuc(
  ruc: string,
  payload: unknown,
): {
  ruc: string;
  razonSocial: string;
  address: string | null;
  district: string | null;
  department: string | null;
  payload: unknown;
} | null {
  if (!isPlainRecord(payload)) return null;
  const lista = firstListaEntry(payload);
  if (!lista) return null;

  const razonSocial = sanitizeField(lista.apenomdenunciado);
  if (!razonSocial) return null;

  return {
    ruc,
    razonSocial,
    address: sanitizeField(lista.direstablecimiento),
    district: sanitizeField(lista.desdistrito),
    department: sanitizeField(lista.desdepartamento),
    payload,
  };
}
