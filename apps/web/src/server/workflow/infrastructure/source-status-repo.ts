import type { SunatEconomicActivity } from "~/server/client-search/enrichment/sunat/contracts";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentQuery } from "~/server/client-search/status";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  SourceStatusRepository,
  SunatSourceStatus,
} from "~/server/workflow/application/ports/source-status-repository";

function toPipelineSunatStatus(input: {
  lifecycle: "idle" | "queued" | "running" | "succeeded" | "failed";
  freshness: "fresh" | "stale" | "none";
}): SunatSourceStatus {
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
    district: string | null;
    department: string | null;
    contributorStatus: string | null;
    contributorCondition: string | null;
    economicActivities: SunatEconomicActivity[];
    payloadJson: string;
  } | null,
) {
  if (!overlay) {
    return {
      fetchedAt: null,
      district: null,
      department: null,
      contributorStatus: null,
      contributorCondition: null,
      economicActivities: [],
      payloadAvailable: false,
    };
  }

  return {
    fetchedAt: overlay.fetchedAt,
    district: overlay.district,
    department: overlay.department,
    contributorStatus: overlay.contributorStatus,
    contributorCondition: overlay.contributorCondition,
    economicActivities: overlay.economicActivities,
    payloadAvailable: overlay.payloadJson.trim().length > 0,
  };
}

export function createSourceStatusRepo(
  db: DatabaseExecutor,
): SourceStatusRepository {
  const enrichmentRepo = createSearchEnrichmentRepo(db);
  const enrichmentQuery = createEnrichmentQuery(enrichmentRepo);

  return {
    async findByRuc(ruc) {
      const enrichmentStatus = await enrichmentQuery.getStatus("ruc", ruc);
      const overlay = toPipelineOverlay(enrichmentStatus.overlay);

      return {
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
