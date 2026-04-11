import type {
  DniApiResult,
  RucApiResult,
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
    // Ignore all errors; caller will handle null response
    return null;
  }
}

async function fetchDni(dni: string): Promise<DniApiResult> {
  const firstPayload = await tryRequest(() => fetchDniFromItfisdenreg(dni));
  const firstMapped = mapDniData(dni, firstPayload);
  if (firstMapped) return { ok: true, data: firstMapped };

  const fallbackPayload = await tryRequest(() => fetchDniFromAtencion(dni));
  const fallbackMapped = mapDniData(dni, fallbackPayload);
  if (fallbackMapped) return { ok: true, data: fallbackMapped };

  return { ok: false, error: { kind: "not_found" } };
}

async function fetchRuc(ruc: string): Promise<RucApiResult> {
  const [itfisResult, consultaResult] = await Promise.allSettled([
    tryRequest(() => fetchRucFromItfisdenreg(ruc)),
    tryRequest(() => fetchRucFromConsultaRuc(ruc)),
  ]);

  const itfisPayload =
    itfisResult.status === "fulfilled" ? itfisResult.value : null;
  const itfisData = mapItfisRucData(ruc, itfisPayload);
  if (!itfisData) {
    return { ok: false, error: { kind: "not_found" } };
  }

  const consultaRaw =
    consultaResult.status === "fulfilled" ? consultaResult.value : null;
  const consultaParsed =
    typeof consultaRaw === "string" && consultaRaw.includes("<html")
      ? parseRucHtml(consultaRaw)
      : null;
  const consultaData = mapConsultaRucData(consultaParsed);

  return {
    ok: true,
    data: {
      ...itfisData,
      contributorStatus: consultaData?.contributorStatus ?? null,
      contributorCondition: consultaData?.contributorCondition ?? null,
    },
  };
}

export function createSunatScraperClient(): SunatScraperClient {
  return { fetchDni, fetchRuc };
}
