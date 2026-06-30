import { createJobQueue } from "~/lib/job-queue/job-queue";
import { applySunatEnrichment } from "~/server/identity/enrichment/writeback";
import {
  createSunatEnrichmentWritebackOutboxRepo,
  type SunatEnrichmentWritebackJob,
  type SunatEnrichmentWritebackOutboxRepo,
} from "~/server/identity/enrichment/writeback-outbox-repo";
import { createPartyRepo } from "~/server/identity/organization/repo";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export function createSunatEnrichmentWritebackQueue(
  workerId: string,
  deps: {
    executor: DatabaseExecutor;
    store?: SunatEnrichmentWritebackOutboxRepo;
    now?: () => Date;
  },
) {
  const now = deps.now ?? (() => new Date());
  const store =
    deps.store ?? createSunatEnrichmentWritebackOutboxRepo(deps.executor);
  const party = createPartyRepo(deps.executor);

  return createJobQueue<SunatEnrichmentWritebackJob>({
    name: "sunat-enrichment-writeback",
    leaseMs: 30_000,
    now,
    workerId,
    store,
    handle: async (job) => {
      await applySunatEnrichment({
        party,
        overlay: {
          documentType: job.document_type,
          documentValue: job.document_value,
          legalName: job.legal_name,
          address: job.address,
          district: job.district,
          department: job.department,
        },
      });
      return { kind: "done" };
    },
  });
}
