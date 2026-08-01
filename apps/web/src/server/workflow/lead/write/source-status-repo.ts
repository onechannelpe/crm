import type { Ruc } from "~/domain/identity/document";
import type { Overlay } from "~/server/client-search/model";
import { createCompanyRegistryRepo } from "~/server/client-search/repository";
import { createEnrichmentQuery } from "~/server/client-search/status";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type {
  LeadSourceStatus,
  SunatSourceStatus,
} from "~/server/workflow/lead/domain/rows";

export type SourceStatusRepository = {
  findByRuc(ruc: Ruc, asOf: Date): Promise<LeadSourceStatus>;
};

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
  overlay: Overlay | null,
): Omit<LeadSourceStatus["sunat"], "status"> {
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
    payloadAvailable: overlay.payload !== null,
  };
}

export function createSourceStatusRepo(
  db: DatabaseExecutor,
): SourceStatusRepository {
  const enrichmentRepo = createCompanyRegistryRepo(db);
  const enrichmentQuery = createEnrichmentQuery(enrichmentRepo);

  return {
    async findByRuc(ruc, asOf) {
      const enrichmentStatus = await enrichmentQuery.getStatus(
        { kind: "ruc", value: ruc },
        asOf,
      );
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
