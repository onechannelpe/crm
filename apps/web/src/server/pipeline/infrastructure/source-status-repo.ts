import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import {
  createEnrichmentQuery,
  toPipelineOverlay,
  toPipelineSunatStatus,
} from "~/server/client-search/status";
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
