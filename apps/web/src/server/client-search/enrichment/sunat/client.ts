import type { EnrichmentError } from "../../model";
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
  isHttpStatusError,
} from "./endpoints";
import { mapConsultaRucData, mapDniData, mapItfisRucData } from "./mappers";
import { parseRucHtml } from "./parsers";

function classifyProviderError(error: unknown): EnrichmentError {
  if (error instanceof DOMException && error.name === "AbortError") {
    return { kind: "timeout" };
  }

  if (isHttpStatusError(error)) {
    if (error.status >= 500) {
      return { kind: "server_error", detail: error.message };
    }
    return { kind: "not_found" };
  }

  if (error instanceof Error) {
    return { kind: "server_error", detail: error.message };
  }

  return { kind: "server_error" };
}

async function safeRequest<T>(
  request: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: EnrichmentError }> {
  try {
    return { ok: true, value: await request() };
  } catch (error: unknown) {
    return { ok: false, error: classifyProviderError(error) };
  }
}

async function fetchDni(
  dni: string,
  signal: AbortSignal,
): Promise<DniApiResult> {
  const primary = await safeRequest(() => fetchDniFromItfisdenreg(dni, signal));
  if (primary.ok) {
    const mapped = mapDniData(dni, primary.value);
    if (mapped) {
      return { ok: true, data: mapped };
    }
  }

  const fallback = await safeRequest(() => fetchDniFromAtencion(dni, signal));
  if (fallback.ok) {
    const mapped = mapDniData(dni, fallback.value);
    if (mapped) {
      return { ok: true, data: mapped };
    }
  }

  if (!primary.ok || !fallback.ok) {
    const retryableError = [primary, fallback].find(
      (result): result is { ok: false; error: EnrichmentError } =>
        !result.ok &&
        (result.error.kind === "server_error" ||
          result.error.kind === "timeout"),
    );
    if (retryableError) {
      return { ok: false, error: retryableError.error };
    }
  }

  return { ok: false, error: { kind: "not_found" } };
}

async function fetchRuc(
  ruc: string,
  signal: AbortSignal,
): Promise<RucApiResult> {
  const [itfisResult, consultaResult] = await Promise.all([
    safeRequest(() => fetchRucFromItfisdenreg(ruc, signal)),
    safeRequest(() => fetchRucFromConsultaRuc(ruc, signal)),
  ]);

  if (!itfisResult.ok) {
    return { ok: false, error: itfisResult.error };
  }

  const itfisData = mapItfisRucData(ruc, itfisResult.value);
  if (!itfisData) {
    return { ok: false, error: { kind: "not_found" } };
  }

  const consultaRaw = consultaResult.ok ? consultaResult.value : null;
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
