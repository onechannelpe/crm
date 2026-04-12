import { isPlainRecord } from "~/lib/type-guards";

import type { SunatDniData, SunatRucData } from "./contracts";
import { sanitizeField } from "./utils";

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

export function mapDniData(dni: string, payload: unknown): SunatDniData | null {
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

export function mapItfisRucData(
  ruc: string,
  payload: unknown,
): SunatRucData | null {
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
    contributorStatus: null,
    contributorCondition: null,
    payload,
  };
}

export function mapConsultaRucData(parsed: Record<string, string> | null): {
  contributorStatus: string | null;
  contributorCondition: string | null;
} | null {
  if (!parsed) return null;

  const normalizeLabel = (label: string): string =>
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/:/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const findValue = (candidateLabel: string): string | null => {
    const normalizedCandidate = normalizeLabel(candidateLabel);
    for (const [label, value] of Object.entries(parsed)) {
      if (normalizeLabel(label) === normalizedCandidate) {
        return sanitizeField(value) ?? null;
      }
    }
    return null;
  };

  return {
    contributorStatus: findValue("estado del contribuyente"),
    contributorCondition: findValue("condicion del contribuyente"),
  };
}
