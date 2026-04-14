import { isPlainRecord } from "~/lib/type-guards";

import type { SunatScraperClient } from "./enrichment/sunat/contracts";
import { sanitizeField } from "./enrichment/sunat/text";
import type { Overlay, ProcessResult } from "./model";
import type { JobRow, OverlayRow } from "./ports";

const OVERLAY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function processEnrichmentJob(
  job: JobRow,
  scraper: SunatScraperClient,
  signal: AbortSignal,
  now: number = Date.now(),
): Promise<ProcessResult> {
  if (job.document_type === "dni") {
    const result = await scraper.fetchDni(job.document_value, signal);

    if (!result.ok) {
      const shouldRetry =
        result.error.kind === "server_error" || result.error.kind === "timeout";
      return {
        ok: false,
        error: result.error,
        shouldRetry,
      };
    }

    const fullName = buildFullName(result.data.payload);
    if (!fullName) {
      return {
        ok: false,
        error: { kind: "not_found" },
        shouldRetry: false,
      };
    }

    const overlay: Overlay = {
      documentType: "dni",
      documentValue: job.document_value,
      fullName,
      legalName: null,
      address: null,
      district: null,
      department: null,
      contributorStatus: null,
      contributorCondition: null,
      economicActivities: [],
      source: "sunat",
      fetchedAt: now,
      expiresAt: now + OVERLAY_TTL_MS,
      payloadJson: JSON.stringify(result.data.payload),
    };
    return { ok: true, overlay };
  }

  const result = await scraper.fetchRuc(job.document_value, signal);

  if (!result.ok) {
    const shouldRetry =
      result.error.kind === "server_error" || result.error.kind === "timeout";
    return {
      ok: false,
      error: result.error,
      shouldRetry,
    };
  }

  const overlay: Overlay = {
    documentType: "ruc",
    documentValue: job.document_value,
    fullName: null,
    legalName: result.data.razonSocial?.trim() || null,
    address: result.data.address,
    district: result.data.district,
    department: result.data.department,
    contributorStatus: result.data.contributorStatus,
    contributorCondition: result.data.contributorCondition,
    economicActivities: result.data.economicActivities,
    source: "sunat",
    fetchedAt: now,
    expiresAt: now + OVERLAY_TTL_MS,
    payloadJson: JSON.stringify(result.data.payload),
  };
  return { ok: true, overlay };
}

export function overlayToRow(overlay: Overlay): OverlayRow {
  return {
    document_type: overlay.documentType,
    document_value: overlay.documentValue,
    full_name: overlay.fullName,
    legal_name: overlay.legalName,
    address: overlay.address,
    district: overlay.district,
    department: overlay.department,
    contributor_status: overlay.contributorStatus,
    contributor_condition: overlay.contributorCondition,
    economic_activities_json: JSON.stringify(overlay.economicActivities),
    source: overlay.source,
    fetched_at: overlay.fetchedAt,
    expires_at: overlay.expiresAt,
    payload_json: overlay.payloadJson,
  };
}

function buildFullName(payload: unknown): string | null {
  if (!isPlainRecord(payload)) {
    return null;
  }

  const nombres =
    sanitizeField(payload.nombres) ??
    sanitizeField(payload.nombreSoli) ??
    sanitizeField(payload.nombre);
  const apellidoPaterno =
    sanitizeField(payload.apellidoPaterno) ??
    sanitizeField(payload.apePatSoli) ??
    sanitizeField(payload.apellido_pat);
  const apellidoMaterno =
    sanitizeField(payload.apellidoMaterno) ??
    sanitizeField(payload.apeMatSoli) ??
    sanitizeField(payload.apellido_mat);

  const parts = [apellidoPaterno, apellidoMaterno, nombres].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );

  return parts.length > 0 ? parts.join(" ") : null;
}
