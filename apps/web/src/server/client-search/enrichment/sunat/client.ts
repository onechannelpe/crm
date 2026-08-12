import type { EnrichmentError } from "../../model";
import { readSnapshot } from "./consulta-ruc";
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
import { readDni, readRuc } from "./itfis";

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
    const mapped = readDni(dni, primary.value);
    if (mapped) {
      return { ok: true, data: mapped, observedAt: new Date() }; // clock-boundary: external SUNAT observation
    }
  }

  const fallback = await safeRequest(() => fetchDniFromAtencion(dni, signal));
  if (fallback.ok) {
    const mapped = readDni(dni, fallback.value);
    if (mapped) {
      return { ok: true, data: mapped, observedAt: new Date() }; // clock-boundary: external SUNAT observation
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

  const itfisData = readRuc(ruc, itfisResult.value);
  if (!itfisData) {
    return { ok: false, error: { kind: "not_found" } };
  }

  const consultaRaw = consultaResult.ok ? consultaResult.value : null;
  const consultaSnapshot =
    typeof consultaRaw === "string" && consultaRaw.includes("<html")
      ? readSnapshot(consultaRaw)
      : null;

  return {
    ok: true,
    observedAt: new Date(), // clock-boundary: external SUNAT observation
    data: {
      ...itfisData,
      contributorStatus: consultaSnapshot?.contributorStatus ?? null,
      contributorCondition: consultaSnapshot?.contributorCondition ?? null,
      economicActivities: consultaSnapshot?.economicActivities ?? [],
      payload: {
        itfis: itfisData.payload,
        consultaRuc: consultaSnapshot?.fields ?? null,
        extracted: {
          contributorStatus: consultaSnapshot?.contributorStatus ?? null,
          contributorCondition: consultaSnapshot?.contributorCondition ?? null,
          economicActivities: consultaSnapshot?.economicActivities ?? [],
        },
      },
    },
  };
}

export function createSunatScraperClient(): SunatScraperClient {
  return { fetchDni, fetchRuc };
}
