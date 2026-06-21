import type { Document } from "~/server/shared/document";

import type { SunatEconomicActivity } from "./enrichment/sunat/contracts";
import type { EnrichmentStatus, Overlay } from "./model";
import type { EnrichmentRepositoryPort, JobRow, OverlayRow } from "./ports";

export interface EnrichmentQuery {
  getStatus(document: Document, now?: number): Promise<EnrichmentStatus>;
}

export function createEnrichmentQuery(
  repo: EnrichmentRepositoryPort,
): EnrichmentQuery {
  return {
    async getStatus(document, now = Date.now()) {
      const [job, overlayRow] = await Promise.all([
        repo.getJobStatus(document.kind, document.value),
        repo.getOverlay(document.kind, document.value),
      ]);

      const freshness = resolveFreshness(overlayRow, now);
      const lifecycle = resolveLifecycle(job, freshness);
      const overlay = overlayRow ? rowToOverlay(overlayRow) : null;

      return {
        documentType: document.kind,
        documentValue: document.value,
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
  overlay: OverlayRow | null | undefined,
  now: number,
): EnrichmentStatus["freshness"] {
  if (!overlay) {
    return "none";
  }

  return overlay.expires_at > now ? "fresh" : "stale";
}

function resolveLifecycle(
  job: JobRow | null | undefined,
  freshness: EnrichmentStatus["freshness"],
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

function rowToOverlay(row: OverlayRow): Overlay {
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
    economicActivities: parseEconomicActivities(row.economic_activities_json),
    source: row.source,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    payloadJson: row.payload_json,
  };
}

function parseEconomicActivities(
  value: string | null,
): SunatEconomicActivity[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (typeof entry !== "object" || entry === null) return null;

        const role = Reflect.get(entry, "role");
        const order = Reflect.get(entry, "order");
        const label = Reflect.get(entry, "label");
        const code = Reflect.get(entry, "code");
        const description = Reflect.get(entry, "description");
        if (
          (role !== "principal" && role !== "secondary") ||
          (order !== null && typeof order !== "number") ||
          typeof label !== "string" ||
          typeof code !== "string" ||
          typeof description !== "string"
        ) {
          return null;
        }

        return {
          role,
          order,
          label,
          code,
          description,
        };
      })
      .filter((entry): entry is SunatEconomicActivity => entry !== null);
  } catch {
    return [];
  }
}
