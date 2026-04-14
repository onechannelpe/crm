import { isPlainRecord } from "~/lib/type-guards";

import type {
  SunatDniData,
  SunatEconomicActivity,
  SunatRucData,
} from "./contracts";
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

function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/:/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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
    economicActivities: [],
    payload,
  };
}

export function mapConsultaRucData(parsed: Record<string, string> | null): {
  contributorStatus: string | null;
  contributorCondition: string | null;
  economicActivities: SunatEconomicActivity[];
} | null {
  if (!parsed) return null;

  const findValue = (candidateLabel: string): string | null => {
    const normalizedCandidate = normalizeLabel(candidateLabel);
    for (const [label, value] of Object.entries(parsed)) {
      if (normalizeLabel(label) === normalizedCandidate) {
        return sanitizeField(value) ?? null;
      }
    }
    return null;
  };

  const activityText =
    findValue("actividad(es) economica(s)") ?? findValue("actividad economica");

  return {
    contributorStatus: findValue("estado del contribuyente"),
    contributorCondition: findValue("condicion del contribuyente"),
    economicActivities: parseEconomicActivities(activityText),
  };
}

function parseEconomicActivities(
  value: string | null,
): SunatEconomicActivity[] {
  if (!value) return [];

  const matches = [
    ...value.matchAll(
      /(Principal|Secundaria\s+\d+)\s*-\s*([0-9]+)\s*-\s*([\s\S]*?)(?=\s*(?:Principal|Secundaria\s+\d+)\s*-\s*[0-9]+\s*-|$)/gi,
    ),
  ];

  return matches
    .map((match) => {
      const label = sanitizeField(match[1]);
      const code = sanitizeField(match[2]);
      const description = sanitizeField(match[3]);
      if (!label || !code || !description) return null;

      return {
        kind: label.toLowerCase() === "principal" ? "principal" : "secondary",
        label,
        code,
        description,
      } satisfies SunatEconomicActivity;
    })
    .filter((activity): activity is SunatEconomicActivity => activity !== null);
}
