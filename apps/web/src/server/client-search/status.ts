import type { Document } from "~/server/shared/document";

import type { SunatEconomicActivity } from "./enrichment/sunat/contracts";
import type { EnrichmentStatus, Overlay } from "./model";
import type { CompanyRegistryPort, RegistryRow } from "./ports";

export interface EnrichmentQuery {
  getStatus(document: Document, now?: Date): Promise<EnrichmentStatus>;
}

export function createEnrichmentQuery(
  repo: CompanyRegistryPort,
): EnrichmentQuery {
  return {
    async getStatus(document, now = new Date()) {
      const record = await repo.getRecord(document.kind, document.value);

      return {
        documentType: document.kind,
        documentValue: document.value,
        lifecycle: resolveLifecycle(record),
        freshness: resolveFreshness(record, now),
        overlay: toOverlay(record),
        lastError: record?.last_error ?? null,
        requestedAt: record?.requested_at ?? null,
      };
    },
  };
}

function resolveFreshness(
  record: RegistryRow | null | undefined,
  now: Date,
): EnrichmentStatus["freshness"] {
  if (!record || record.expires_at === null) {
    return "none";
  }
  return record.expires_at > now ? "fresh" : "stale";
}

function resolveLifecycle(
  record: RegistryRow | null | undefined,
): EnrichmentStatus["lifecycle"] {
  if (!record) {
    return "idle";
  }

  switch (record.queue_state) {
    case "pending":
      return "queued";
    case "processing":
      return "running";
    case "done":
      return "succeeded";
    case "failed":
      return "failed";
    default:
      record.queue_state satisfies never;
      return "idle";
  }
}

// A result exists only once a provider has filled the record; until then the
// queue may be pending/processing with all result columns null.
function toOverlay(record: RegistryRow | null | undefined): Overlay | null {
  if (
    !record ||
    record.source === null ||
    record.fetched_at === null ||
    record.expires_at === null
  ) {
    return null;
  }

  return {
    documentType: record.document_type,
    documentValue: record.document_value,
    fullName: record.full_name,
    legalName: record.legal_name,
    address: record.address,
    district: record.district,
    department: record.department,
    contributorStatus: record.contributor_status,
    contributorCondition: record.contributor_condition,
    economicActivities: normalizeEconomicActivities(
      record.economic_activities_json,
    ),
    source: record.source,
    fetchedAt: record.fetched_at,
    expiresAt: record.expires_at,
    payload: record.payload_json,
  };
}

// `economic_activities_json` is a jsonb column, so it arrives already parsed.
// Narrow defensively at this boundary rather than trusting the stored shape.
function normalizeEconomicActivities(value: unknown): SunatEconomicActivity[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry): SunatEconomicActivity | null => {
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

      return { role, order, label, code, description };
    })
    .filter((entry): entry is SunatEconomicActivity => entry !== null);
}
