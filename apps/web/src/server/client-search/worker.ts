import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { SunatScraperClient } from "~/server/client-search/enrichment/sunat/contracts";
import {
  processEnrichmentJob,
  overlayToRow,
} from "~/server/client-search/process";
import type { EnrichmentRepositoryPort } from "~/server/client-search/types";

type EnrichmentWorkerDeps = {
  enrichmentRepo: EnrichmentRepositoryPort;
  scraper: SunatScraperClient;
};

class EnrichmentWorkerError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "EnrichmentWorkerError";
    this.retryable = retryable;
  }
}

export function createEnrichmentQueue(
  workerId: string,
  deps: EnrichmentWorkerDeps,
) {
  const leaseMs = 30_000;
  const batchSize = 20;
  const maxConcurrency = 3;
  const { enrichmentRepo, scraper } = deps;

  return createJobQueue({
    name: "enrichment",
    leaseMs,
    batchSize,
    maxConcurrency,
    poll: (limit: number) => enrichmentRepo.leaseJobs(limit, leaseMs, workerId),
    handle: async (job, signal: AbortSignal) => {
      if (signal.aborted) throw new Error("Job aborted");

      const result = await processEnrichmentJob(job, scraper);

      if (signal.aborted) throw new Error("Job aborted after processing");

      if (!result.ok) {
        throw new EnrichmentWorkerError(
          `enrichment:${result.error.kind}${
            result.error.kind === "malformed_response" ||
            result.error.kind === "server_error"
              ? `:${result.error.detail ?? "unknown"}`
              : ""
          }`,
          result.shouldRetry,
        );
      }

      // Success: store overlay
      await enrichmentRepo.completeJob(
        job.id,
        workerId,
        overlayToRow(result.overlay),
        Date.now(),
      );

      return { completedAt: Date.now() };
    },
    extendLease: (id: number) =>
      enrichmentRepo.extendLease(id, workerId, leaseMs),
    onComplete: async (_id: number) => {
      // Job already marked complete in handle()
    },
    classifyFailure: (error, _job) => {
      if (error instanceof EnrichmentWorkerError) {
        return {
          retryable: error.retryable,
          reason: error.message,
          retryAt: Date.now() + 60_000,
        };
      }

      return {
        retryable: true,
        reason: error instanceof Error ? error.message : "Unknown error",
        retryAt: Date.now() + 60_000,
      };
    },
    onRetry: async (id: number, availableAt: number) => {
      await enrichmentRepo.failJobRetryable(
        id,
        workerId,
        "Retrying",
        availableAt,
      );
    },
    onFail: async (id: number, reason: string) => {
      await enrichmentRepo.failJobTerminal(id, workerId, reason, Date.now());
    },
  });
}
