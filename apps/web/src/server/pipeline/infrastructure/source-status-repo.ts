import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentQuery } from "~/server/client-search/status";
import type { SourceStatusRepository } from "~/server/pipeline/application/ports/source-status-repository";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

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

function toPipelineSunatStatus(input: {
  lifecycle: "idle" | "queued" | "running" | "succeeded" | "failed";
  freshness: "fresh" | "stale" | "none";
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

function toPipelineOverlay(
  overlay: {
    fetchedAt: number;
    legalName: string | null;
    address: string | null;
    district: string | null;
    department: string | null;
    contributorStatus: string | null;
    contributorCondition: string | null;
    payloadJson: string;
  } | null,
) {
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

export function createSourceStatusRepo(
  db: DatabaseExecutor,
): SourceStatusRepository {
  const enrichmentRepo = createSearchEnrichmentRepo(db);
  const enrichmentQuery = createEnrichmentQuery(enrichmentRepo);

  return {
    async findByLead(input) {
      const enrichmentStatus = await enrichmentQuery.getStatus(
        "ruc",
        input.ruc,
      );
      const overlay = toPipelineOverlay(enrichmentStatus.overlay);

      return {
        engine: resolveEngineStatus({
          razonSocial: input.razonSocial,
          address: input.address,
          leadUpdatedAt: input.leadUpdatedAt,
        }),
        sunat: {
          status: toPipelineSunatStatus({
            lifecycle: enrichmentStatus.lifecycle,
            freshness: enrichmentStatus.freshness,
          }),
          ...overlay,
        },
      };
    },
  };
}
