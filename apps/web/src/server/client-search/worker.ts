import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { SunatScraperClient } from "~/server/client-search/enrichment/sunat/contracts";
import type { EnrichmentRepositoryPort } from "~/server/client-search/ports";
import {
  processEnrichmentJob,
  overlayToRow,
} from "~/server/client-search/process";

type EnrichmentWorkerDeps = {
  enrichmentRepo: EnrichmentRepositoryPort;
  scraper: SunatScraperClient;
  now?: () => Date;
};

export function createEnrichmentQueue(
  workerId: string,
  deps: EnrichmentWorkerDeps,
) {
  const leaseMs = 30_000;
  const { enrichmentRepo, scraper } = deps;
  const now = deps.now ?? (() => new Date());

  return createJobQueue({
    name: "enrichment",
    leaseMs,
    maxConcurrency: 3,
    now,
    workerId,
    store: enrichmentRepo.store,
    handle: async (job, signal) => {
      const result = await processEnrichmentJob(job, scraper, signal, now());
      if (result.ok) {
        // Overlay + writeback-outbox land in one idempotent transaction that also
        // wakes the writeback queue; the job row's done transition is settled by
        // the engine, stamping `completed_at` and clearing `last_error`.
        await enrichmentRepo.recordCompletion(
          overlayToRow(result.overlay),
          now(),
        );
        return { kind: "done" };
      }
      if (result.shouldRetry) {
        return { kind: "retry", reason: `enrichment:${result.error.kind}` };
      }
      return { kind: "fail", reason: `enrichment:${result.error.kind}` };
    },
  });
}
