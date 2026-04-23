import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { applySunatEnrichment } from "~/server/workflow/application/commands/apply-sunat-enrichment";
import { createLeadRepo } from "~/server/workflow/infrastructure/lead-repo";
import {
  createSunatEnrichmentWritebackOutboxRepo,
  type SunatEnrichmentWritebackOutboxRepo,
} from "~/server/workflow/infrastructure/sunat-enrichment-writeback-outbox-repo";

type SunatEnrichmentWritebackJob = {
  id: number;
  document_type: "dni" | "ruc";
  document_value: string;
  legal_name: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  fetched_at: number;
  attempt_count: number;
  max_attempts: number;
};

export function createSunatEnrichmentWritebackQueue(
  workerId: string,
  deps: {
    executor: DatabaseExecutor;
    repo?: SunatEnrichmentWritebackOutboxRepo;
  },
) {
  const leaseMs = 30_000;
  const batchSize = 50;
  const repo =
    deps.repo ?? createSunatEnrichmentWritebackOutboxRepo(deps.executor);
  const leads = createLeadRepo(deps.executor);

  return createJobQueue<SunatEnrichmentWritebackJob, void>({
    name: "sunat-enrichment-writeback",
    leaseMs,
    batchSize,
    poll: (limit: number) => repo.claimQueued(workerId, limit, leaseMs),
    handle: async (job, _signal) => {
      await applySunatEnrichment({
        leads,
        now: Date.now(),
        overlay: {
          documentType: job.document_type,
          documentValue: job.document_value,
          legalName: job.legal_name,
          address: job.address,
          district: job.district,
          department: job.department,
        },
      });
    },
    extendLease: (id: number) => repo.extendLease(id, workerId, leaseMs),
    onComplete: (id: number) => repo.markCompleted(id, workerId),
    onRetry: (id: number, availableAt: number) =>
      repo.scheduleRetry(id, availableAt, workerId),
    onFail: (id: number, reason: string) =>
      repo.markFailed(id, reason, workerId),
  });
}
