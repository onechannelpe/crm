import type {
  EnrichmentDocumentType,
  EnrichmentRepositoryPort,
  EnrichmentStatus,
  EnrichmentJobStatus,
  EnrichmentOverlay,
  EnrichmentJobLease,
  EnrichmentOverlayRow,
} from "./types";

/**
 * Pure read-side queries for enrichment status.
 */
export interface EnrichmentQuery {
  getStatus(
    documentType: EnrichmentDocumentType,
    documentValue: string,
    now?: number,
  ): Promise<EnrichmentStatus>;
}

export function createEnrichmentQuery(
  repo: EnrichmentRepositoryPort,
): EnrichmentQuery {
  return {
    async getStatus(documentType, documentValue, now = Date.now()) {
      // Fetch both job status and overlay in parallel
      const [job, overlayRow] = await Promise.all([
        repo.getJobStatus(documentType, documentValue),
        repo.getOverlay(documentType, documentValue, now),
      ]);

      const status = resolveStatus(job, overlayRow, now);
      const overlay = overlayRow ? rowToOverlay(overlayRow) : null;

      return {
        documentType,
        documentValue,
        status,
        overlay,
        lastError: job?.last_error ?? null,
        requestedAt: job?.requested_at ?? null,
      };
    },
  };
}

/**
 * Determine effective status from job + overlay state.
 */
function resolveStatus(
  job: EnrichmentJobLease | null | undefined,
  overlay: EnrichmentOverlayRow | null | undefined,
  now: number,
): EnrichmentJobStatus {
  // If we have a valid overlay, status is completed
  if (overlay && overlay.expires_at > now) {
    return "completed";
  }

  // If overlay expired, still mark as completed (don't hide old data)
  if (overlay && overlay.expires_at <= now) {
    return "completed";
  }

  // No overlay, check job state
  if (!job) {
    return "idle";
  }

  // Map job status directly
  return job.status;
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
