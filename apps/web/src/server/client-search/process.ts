import type { DomainPatch } from "~/lib/job-queue/job-store";
import { isPlainRecord } from "~/lib/type-guards";

import type { SunatScraperClient } from "./enrichment/sunat/contracts";
import { sanitizeField } from "./enrichment/sunat/text";
import type { Overlay, ProcessResult } from "./model";
import type { RegistryRow } from "./ports";

const OVERLAY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function processEnrichmentJob(
  job: RegistryRow,
  scraper: SunatScraperClient,
  signal: AbortSignal,
  now: Date = new Date(),
): Promise<ProcessResult> {
  const expiresAt = new Date(now.getTime() + OVERLAY_TTL_MS);
  if (job.document_type === "dni") {
    const result = await scraper.fetchDni(job.document_value, signal);

    if (!result.ok) {
      const shouldRetry =
        result.error.kind === "server_error" || result.error.kind === "timeout";
      return { ok: false, error: result.error, shouldRetry };
    }

    const fullName = buildFullName(result.data.payload);
    if (!fullName) {
      return { ok: false, error: { kind: "not_found" }, shouldRetry: false };
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
      expiresAt,
      payload: result.data.payload,
    };
    return { ok: true, overlay };
  }

  const result = await scraper.fetchRuc(job.document_value, signal);

  if (!result.ok) {
    const shouldRetry =
      result.error.kind === "server_error" || result.error.kind === "timeout";
    return { ok: false, error: result.error, shouldRetry };
  }

  const overlay: Overlay = {
    documentType: "ruc",
    documentValue: job.document_value,
    fullName: null,
    legalName: result.data.legalName?.trim() || null,
    address: result.data.address,
    district: result.data.district,
    department: result.data.department,
    contributorStatus: result.data.contributorStatus,
    contributorCondition: result.data.contributorCondition,
    economicActivities: result.data.economicActivities,
    source: "sunat",
    fetchedAt: now,
    expiresAt,
    payload: result.data.payload,
  };
  return { ok: true, overlay };
}

// The result columns the queue engine writes as it settles the record `done`.
// jsonb columns take stringified JSON (top-level arrays must be stringified).
export function overlayToPatch(overlay: Overlay): DomainPatch {
  return {
    full_name: overlay.fullName,
    legal_name: overlay.legalName,
    address: overlay.address,
    district: overlay.district,
    department: overlay.department,
    contributor_status: overlay.contributorStatus,
    contributor_condition: overlay.contributorCondition,
    economic_activities_json: JSON.stringify(overlay.economicActivities),
    payload_json: JSON.stringify(overlay.payload),
    source: overlay.source,
    fetched_at: overlay.fetchedAt,
    expires_at: overlay.expiresAt,
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
