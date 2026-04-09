import { createJobQueue } from "~/lib/job-queue/job-queue";
import { integrationRuntime } from "~/server/integrations/infrastructure/runtime";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import {
  createReadyForQuotationOutboxRepo,
  type ReadyForQuotationOutboxRepo,
} from "../application/import/outbox-ready-for-quotation-repo";

interface ReadyForQuotationOutboxQueueDeps {
  executor?: DatabaseExecutor;
  repo?: ReadyForQuotationOutboxRepo;
}

type ReadyForQuotationOutboxJob = {
  id: number;
  attempt_count: number;
  max_attempts: number;
  lead_id: number;
  ruc: string;
  branch_id: number;
};

export function createReadyForQuotationOutboxQueue(
  workerId: string,
  deps: ReadyForQuotationOutboxQueueDeps = {},
) {
  const leaseMs = 30_000;
  const batchSize = 50;
  const executor = deps.executor ?? integrationRuntime.executor;
  const repo = deps.repo ?? createReadyForQuotationOutboxRepo(executor);

  return createJobQueue<ReadyForQuotationOutboxJob, void>({
    name: "integration-outbox-ready-for-quotation",
    leaseMs,
    batchSize,
    poll: (limit: number) => repo.claimPending(workerId, limit, leaseMs),
    handle: async (job) => {
      const audience = await executor
        .selectFrom("users")
        .select("id")
        .where("branch_id", "=", job.branch_id)
        .where("role", "=", "back_office")
        .where("is_active", "=", 1)
        .execute();
      if (audience.length < 1) {
        return;
      }

      await executor
        .insertInto("app_notifications")
        .values(
          audience.map((user) => ({
            user_id: user.id,
            event_type: "lead.ready_for_quotation",
            priority: "normal",
            title: "Prospecto listo para cotizacion",
            body_text: `El prospecto RUC ${job.ruc} esta listo para cotizar`,
            action_url: `/quotations/${job.lead_id}`,
            dedupe_key: `lead_rfq_${job.lead_id}`,
            metadata_json: null,
            created_at: Date.now(),
            read_at: null,
          })),
        )
        .onConflict((oc) => oc.columns(["user_id", "dedupe_key"]).doNothing())
        .execute();
    },
    extendLease: (id: number) => repo.extendLease(id, workerId, leaseMs),
    onComplete: (id: number) => repo.markCompleted(id),
    onRetry: (id: number, availableAt: number) =>
      repo.scheduleRetry(id, availableAt),
    onFail: (id: number, reason: string) => repo.markFailed(id, reason),
  });
}
