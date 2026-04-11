import { isPlainRecord } from "~/lib/type-guards";

import type { SunatScraperClient } from "./enrichment/sunat/contracts";
import { sanitizeField } from "./enrichment/sunat/utils";
import type {
  EnrichmentOverlay,
  EnrichmentOverlayRow,
  EnrichmentJobLease,
  EnrichmentProcessResult,
} from "./types";

const OVERLAY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pure processor: takes a job and a scraper, returns overlay or classified error.
 * No DB access, no side effects. Fully testable.
 */
export async function processEnrichmentJob(
  job: EnrichmentJobLease,
  scraper: SunatScraperClient,
  now: number = Date.now(),
): Promise<EnrichmentProcessResult> {
  // Fetch from external API; separate paths for DNI vs RUC to maintain type safety
  if (job.document_type === "dni") {
    const result = await scraper.fetchDni(job.document_value);

    if (!result.ok) {
      const shouldRetry =
        result.error.kind === "server_error" || result.error.kind === "timeout";
      return {
        ok: false,
        error: result.error,
        shouldRetry,
      };
    }

    const fullName = buildFullName(result.data);
    if (!fullName) {
      return {
        ok: false,
        error: { kind: "not_found" },
        shouldRetry: false,
      };
    }

    const overlay: EnrichmentOverlay = {
      documentType: "dni",
      documentValue: job.document_value,
      fullName,
      legalName: null,
      address: null,
      district: null,
      department: null,
      contributorStatus: null,
      contributorCondition: null,
      source: "sunat",
      fetchedAt: now,
      expiresAt: now + OVERLAY_TTL_MS,
      payloadJson: JSON.stringify(
        isPlainRecord(result.data) ? result.data.payload : result.data,
      ),
    };
    return { ok: true, overlay };
  } else {
    // RUC: separate call maintains type narrowing
    const result = await scraper.fetchRuc(job.document_value);

    if (!result.ok) {
      const shouldRetry =
        result.error.kind === "server_error" || result.error.kind === "timeout";
      return {
        ok: false,
        error: result.error,
        shouldRetry,
      };
    }

    const overlay: EnrichmentOverlay = {
      documentType: "ruc",
      documentValue: job.document_value,
      fullName: null,
      legalName: result.data.razonSocial?.trim() || null,
      address: result.data.address,
      district: result.data.district,
      department: result.data.department,
      contributorStatus: result.data.contributorStatus,
      contributorCondition: result.data.contributorCondition,
      source: "sunat",
      fetchedAt: now,
      expiresAt: now + OVERLAY_TTL_MS,
      payloadJson: JSON.stringify(result.data.payload),
    };
    return { ok: true, overlay };
  }
}

/**
 * Convert overlay to row format for DB insertion.
 */
export function overlayToRow(overlay: EnrichmentOverlay): EnrichmentOverlayRow {
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
    source: overlay.source,
    fetched_at: overlay.fetchedAt,
    expires_at: overlay.expiresAt,
    payload_json: overlay.payloadJson,
  };
}

/**
 * Build full name from DNI payload fields.
 */
function buildFullName(payload: any): string | null {
  if (!isPlainRecord(payload)) return null;

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
    (p): p is string => typeof p === "string" && p.length > 0,
  );

  return parts.length > 0 ? parts.join(" ") : null;
}
