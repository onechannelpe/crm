import { isPlainRecord } from "~/lib/type-guards";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentQuery } from "~/server/client-search/status";
import type {
  LeadSunatEconomicActivity,
  SourceStatusRepository,
  SunatSourceStatus,
} from "~/server/pipeline/application/ports/source-status-repository";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

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
    economicActivities: parseEconomicActivitiesFromPayload(overlay.payloadJson),
    payloadAvailable: overlay.payloadJson.trim().length > 0,
  };
}

function parseEconomicActivitiesFromPayload(
  payloadJson: string,
): LeadSunatEconomicActivity[] {
  if (payloadJson.trim().length < 1) return [];

  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    if (!isPlainRecord(parsed)) return [];

    const extracted = parsed.extracted;
    if (!isPlainRecord(extracted)) return [];

    const activities = extracted.economicActivities;
    if (!Array.isArray(activities)) return [];

    return activities
      .map((item) => {
        if (!isPlainRecord(item)) return null;

        const kind = item.kind;
        const label = item.label;
        const code = item.code;
        const description = item.description;
        if (
          (kind !== "principal" && kind !== "secondary") ||
          typeof label !== "string" ||
          typeof code !== "string" ||
          typeof description !== "string"
        ) {
          return null;
        }

        return {
          kind,
          label,
          code,
          description,
        } satisfies LeadSunatEconomicActivity;
      })
      .filter(
        (activity): activity is LeadSunatEconomicActivity => activity !== null,
      );
  } catch {
    return [];
  }
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
