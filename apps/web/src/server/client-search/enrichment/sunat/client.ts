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
import { mapConsultaRucData, mapDniData, mapItfisRucData } from "./mappers";
import { parseRucHtml } from "./parsers";

async function tryRequest<T>(request: () => Promise<T>): Promise<T | null> {
  try {
    return await request();
  } catch {
    return null;
  }
}

async function fetchDni(dni: string): Promise<SunatDniData | null> {
  const firstPayload = await tryRequest(() => fetchDniFromItfisdenreg(dni));
  const firstMapped = mapDniData(dni, firstPayload);
  if (firstMapped) return firstMapped;

  const fallbackPayload = await tryRequest(() => fetchDniFromAtencion(dni));
  return mapDniData(dni, fallbackPayload);
}

async function fetchRuc(ruc: string): Promise<SunatRucData | null> {
  const [itfisResult, consultaResult] = await Promise.allSettled([
    tryRequest(() => fetchRucFromItfisdenreg(ruc)),
    tryRequest(() => fetchRucFromConsultaRuc(ruc)),
  ]);

  const itfisPayload =
    itfisResult.status === "fulfilled" ? itfisResult.value : null;
  const itfisData = mapItfisRucData(ruc, itfisPayload);
  if (!itfisData) return null;

  const consultaRaw =
    consultaResult.status === "fulfilled" ? consultaResult.value : null;
  const consultaParsed =
    typeof consultaRaw === "string" && consultaRaw.includes("<html")
      ? parseRucHtml(consultaRaw)
      : null;
  const consultaData = mapConsultaRucData(consultaParsed);

  return {
    ...itfisData,
    contributorStatus: consultaData?.contributorStatus ?? null,
    contributorCondition: consultaData?.contributorCondition ?? null,
  };
}

export function createSunatScraperClient(): SunatScraperClient {
  return { fetchDni, fetchRuc };
}
