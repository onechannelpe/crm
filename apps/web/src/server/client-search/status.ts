import type {
  EnrichmentStatus,
  EnrichmentFreshness,
  EnrichmentOverlay,
} from "./model";
import { normalizeEnrichmentInput } from "./model";
import type {
  EnrichmentRepositoryPort,
  EnrichmentJobLeaseRow,
  EnrichmentOverlayRow,
} from "./ports";

/**
 * Pure read-side queries for enrichment status.
 */
export interface EnrichmentQuery {
  getStatus(
    documentType: string,
    documentValue: string,
    now?: number,
  ): Promise<EnrichmentStatus>;
}

export function createEnrichmentQuery(
  repo: EnrichmentRepositoryPort,
): EnrichmentQuery {
  return {
    async getStatus(documentType, documentValue, now = Date.now()) {
      const normalized = normalizeEnrichmentInput({
        documentType,
        documentValue,
      });

      const [job, overlayRow] = await Promise.all([
        repo.getJobStatus(normalized.documentType, normalized.documentValue),
        repo.getOverlay(normalized.documentType, normalized.documentValue),
      ]);

      const freshness = resolveFreshness(overlayRow, now);
      const lifecycle = resolveLifecycle(job, freshness);
      const overlay = overlayRow ? rowToOverlay(overlayRow) : null;

      return {
        documentType: normalized.documentType,
        documentValue: normalized.documentValue,
        lifecycle,
        freshness,
        overlay,
        lastError: job?.last_error ?? null,
        requestedAt: job?.requested_at ?? null,
      };
    },
  };
}

function resolveFreshness(
  overlay: EnrichmentOverlayRow | null | undefined,
  now: number,
): EnrichmentFreshness {
  if (!overlay) {
    return "none";
  }

  return overlay.expires_at > now ? "fresh" : "stale";
}

function resolveLifecycle(
  job: EnrichmentJobLeaseRow | null | undefined,
  freshness: EnrichmentFreshness,
): EnrichmentStatus["lifecycle"] {
  if (!job) {
    return freshness === "none" ? "idle" : "succeeded";
  }

  if (job.status === "queued" || job.status === "running") {
    return job.status;
  }

  if (job.status === "succeeded") {
    return "succeeded";
  }

  return "failed";
}

/**
 * Convert row to overlay shape.
 */
function rowToOverlay(row: EnrichmentOverlayRow): EnrichmentOverlay {
  return {
    documentType: row.document_type,
    documentValue: row.document_value,
    fullName: row.full_name,
    legalName: row.legal_name,
    address: row.address,
    district: row.district,
    department: row.department,
    contributorStatus: row.contributor_status,
    contributorCondition: row.contributor_condition,
    source: row.source,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    payloadJson: row.payload_json,
  };
}

export function toPipelineSunatStatus(input: {
  lifecycle: EnrichmentStatus["lifecycle"];
  freshness: EnrichmentFreshness;
}): "idle" | "queued" | "running" | "completed" | "failed" | "stale" {
  if (input.freshness === "stale") {
    return "stale";
  }

  switch (input.lifecycle) {
    case "idle":
      return "idle";
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "succeeded":
      return "completed";
    case "failed":
      return "failed";
    default:
      input.lifecycle satisfies never;
      return "idle";
  }
}

export function toPipelineOverlay(overlay: EnrichmentOverlay | null): {
  fetchedAt: number | null;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  contributorStatus: string | null;
  contributorCondition: string | null;
  payloadAvailable: boolean;
} {
  if (!overlay) {
    return {
      fetchedAt: null,
      legalName: null,
      address: null,
      district: null,
      department: null,
      contributorStatus: null,
      contributorCondition: null,
      payloadAvailable: false,
    };
  }

  return {
    fetchedAt: overlay.fetchedAt,
    legalName: overlay.legalName,
    address: overlay.address,
    district: overlay.district,
    department: overlay.department,
    contributorStatus: overlay.contributorStatus,
    contributorCondition: overlay.contributorCondition,
    payloadAvailable: overlay.payloadJson.trim().length > 0,
  };
}
