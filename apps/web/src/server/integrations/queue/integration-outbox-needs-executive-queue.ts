import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import {
  createNeedsExecutiveOutboxRepo,
  type NeedsExecutiveOutboxRepo,
} from "../application/import/outbox-needs-executive-repo";

interface NeedsExecutiveOutboxQueueDeps {
  executor: DatabaseExecutor;
  repo?: NeedsExecutiveOutboxRepo;
}

type NeedsExecutiveOutboxJob = {
  id: number;
  attempt_count: number;
  max_attempts: number;
  lead_id: number;
  ruc: string;
  executive_id: number;
};

export function createNeedsExecutiveOutboxQueue(
  workerId: string,
  deps: NeedsExecutiveOutboxQueueDeps,
) {
  const leaseMs = 30_000;
  const batchSize = 50;
  const executor = deps.executor;
  const repo = deps.repo ?? createNeedsExecutiveOutboxRepo(executor);

  return createJobQueue<NeedsExecutiveOutboxJob, void>({
    name: "integration-outbox-needs-executive",
    leaseMs,
    batchSize,
    poll: (limit: number) => repo.claimPending(workerId, limit, leaseMs),
    handle: async (job) => {
      await executor
        .insertInto("app_notifications")
        .values({
          user_id: job.executive_id,
          event_type: "lead.needs_executive_input",
          priority: "high",
          title: "Accion requerida",
          body_text: `El prospecto RUC ${job.ruc} requiere tu informacion comercial`,
          action_url: "/leads?view=mine",
          dedupe_key: `lead_nei_${job.lead_id}`,
          metadata_json: null,
          created_at: Date.now(),
          read_at: null,
        })
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
