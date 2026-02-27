import type {
  SunatDniData,
  SunatRucData,
  SunatScraperClient,
} from "./contracts";
import {
  fetchDniFromAtencion,
  fetchDniFromItfisdenreg,
  fetchRucFromConsultaRuc,
  fetchRucFromItfisdenreg,
} from "./endpoints";
import { mapDniData, mapRucData } from "./mappers";
import { parseRucHtml } from "./parsers";

async function tryRequest<T>(request: () => Promise<T>): Promise<T | null> {
  try {
    return await request();
  } catch {
    return null;
  }
}

function mapConsultaRucPayload(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;
  if (!payload.includes("<html")) return payload;
  return parseRucHtml(payload);
}

async function fetchDni(dni: string): Promise<SunatDniData | null> {
  const firstPayload = await tryRequest(() => fetchDniFromItfisdenreg(dni));
  const firstMapped = mapDniData(dni, firstPayload);
  if (firstMapped) return firstMapped;

  const fallbackPayload = await tryRequest(() => fetchDniFromAtencion(dni));
  return mapDniData(dni, fallbackPayload);
}

async function fetchRuc(ruc: string): Promise<SunatRucData | null> {
  const firstPayload = await tryRequest(() => fetchRucFromItfisdenreg(ruc));
  const firstMapped = mapRucData(ruc, firstPayload);
  if (firstMapped) return firstMapped;

  const fallbackPayload = await tryRequest(() => fetchRucFromConsultaRuc(ruc));
  return mapRucData(ruc, mapConsultaRucPayload(fallbackPayload));
}

export function createSunatScraperClient(): SunatScraperClient {
  return { fetchDni, fetchRuc };
}
