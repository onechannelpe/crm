import type { Selectable } from "kysely";

import type {
  SearchEnrichmentJobsTable,
  SearchEnrichmentOverlaysTable,
} from "~/lib/db/types";
import type { SourceStatusRepository } from "~/server/pipeline/application/ports/source-status-repository";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

type EnrichmentJobRow = Selectable<SearchEnrichmentJobsTable>;
type EnrichmentOverlayRow = Selectable<SearchEnrichmentOverlaysTable>;

function resolveEngineStatus(input: {
  razonSocial: string | null;
  address: string | null;
  leadUpdatedAt: number;
}) {
  const fields: Array<"razonSocial" | "address"> = [];

  if (input.razonSocial) {
    fields.push("razonSocial");
  }
  if (input.address) {
    fields.push("address");
  }

  return {
    status: fields.length > 0 ? "available" : "missing",
    fetchedAt: fields.length > 0 ? input.leadUpdatedAt : null,
    fields,
  } as const;
}

function resolveSunatStatus(input: {
  job: EnrichmentJobRow | undefined;
  overlay: EnrichmentOverlayRow | undefined;
  now: number;
}) {
  const overlayExpired =
    input.overlay !== undefined && input.overlay.expires_at <= input.now;

  if (input.overlay && !overlayExpired) {
    return {
      status: "completed",
      fetchedAt: input.overlay.fetched_at,
      legalName: input.overlay.legal_name,
      payloadAvailable: input.overlay.payload_json.trim().length > 0,
    } as const;
  }

  if (input.overlay && overlayExpired) {
    return {
      status: "stale",
      fetchedAt: input.overlay.fetched_at,
      legalName: input.overlay.legal_name,
      payloadAvailable: input.overlay.payload_json.trim().length > 0,
    } as const;
  }

  if (!input.job) {
    return {
      status: "idle",
      fetchedAt: null,
      legalName: null,
      payloadAvailable: false,
    } as const;
  }

  if (input.job.status === "queued") {
    return {
      status: "queued",
      fetchedAt: null,
      legalName: null,
      payloadAvailable: false,
    } as const;
  }

  if (input.job.status === "running") {
    return {
      status: "running",
      fetchedAt: null,
      legalName: null,
      payloadAvailable: false,
    } as const;
  }

  if (input.job.status === "failed") {
    return {
      status: "failed",
      fetchedAt: input.job.completed_at,
      legalName: null,
      payloadAvailable: false,
    } as const;
  }

  return {
    status: "completed",
    fetchedAt: input.job.completed_at,
    legalName: null,
    payloadAvailable: false,
  } as const;
}

export function createSourceStatusRepo(
  db: DatabaseExecutor,
): SourceStatusRepository {
  return {
    async findByLead(input) {
      const now = Date.now();

      const [job, overlay] = await Promise.all([
        db
          .selectFrom("search_enrichment_jobs")
          .selectAll()
          .where("document_type", "=", "ruc")
          .where("document_value", "=", input.ruc)
          .orderBy("requested_at", "desc")
          .executeTakeFirst(),
        db
          .selectFrom("search_enrichment_overlays")
          .selectAll()
          .where("document_type", "=", "ruc")
          .where("document_value", "=", input.ruc)
          .where("source", "=", "sunat")
          .orderBy("fetched_at", "desc")
          .executeTakeFirst(),
      ]);

      return {
        engine: resolveEngineStatus({
          razonSocial: input.razonSocial,
          address: input.address,
          leadUpdatedAt: input.leadUpdatedAt,
        }),
        sunat: resolveSunatStatus({
          job,
          overlay,
          now,
        }),
      };
    },
  };
}
