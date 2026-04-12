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
