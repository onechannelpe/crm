import type { SunatDniData, SunatRucData } from "./contracts";
import { isRecord, sanitizeField } from "./utils";

function firstListaEntry(
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!Array.isArray(payload.lista) || payload.lista.length < 1) return null;
  const first = payload.lista[0];
  return isRecord(first) ? first : null;
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
  if (!isRecord(payload)) {
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

export function mapRucData(ruc: string, payload: unknown): SunatRucData | null {
  if (!isRecord(payload)) {
    if (typeof payload === "string" && payload.trim().length > 0) {
      return { ruc, razonSocial: null, payload };
    }
    return null;
  }

  const lista = firstListaEntry(payload);
  const razonSocialRaw =
    sanitizeField(lista?.apenomdenunciado) ??
    sanitizeField(lista?.razonSocial) ??
    sanitizeField(lista?.nombre_o_razon_social) ??
    sanitizeField(payload.razonSocial) ??
    sanitizeField(payload.razon_social) ??
    sanitizeField(payload.nombre_o_razon_social) ??
    sanitizeField(payload["Número de RUC"]);

  const razonSocial = (() => {
    if (!razonSocialRaw) return null;
    const parts = razonSocialRaw.split(" - ");
    return parts.length > 1
      ? sanitizeField(parts.slice(1).join(" - "))
      : razonSocialRaw;
  })();

  if (!razonSocial && Object.keys(payload).length < 1) return null;
  return { ruc, razonSocial, payload };
}
