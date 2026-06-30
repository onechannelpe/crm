import type { Selectable } from "kysely";

import type { SearchEnrichmentCompletionOutboxTable } from "~/lib/db/types";
import { createJobStore } from "~/lib/job-queue/job-store";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

type CompletionOutboxRow = Selectable<SearchEnrichmentCompletionOutboxTable>;

// The completion outbox carries no user-facing status, so queue_state is its only
// lifecycle column and every transition routes straight through the store.
export function createSunatEnrichmentWritebackOutboxRepo(
  executor: DatabaseExecutor,
) {
  const store = createJobStore<CompletionOutboxRow, number>(
    executor,
    "search_enrichment_completion_outbox",
    [
      "id",
      "document_type",
      "document_value",
      "legal_name",
      "address",
      "district",
      "department",
      "fetched_at",
      "queue_state",
      "attempt_count",
      "max_attempts",
      "available_at",
      "lease_owner",
      "lease_until",
      "error_message",
      "created_at",
      "processed_at",
    ],
  );

  return {
    claimQueued: (workerId: string, limit: number, leaseMs: number) =>
      store.claimPending(workerId, Date.now(), limit, leaseMs),

    extendLease: (id: number, workerId: string, leaseMs: number) =>
      store.extendLease(id, workerId, leaseMs, Date.now()),

    markCompleted: (id: number) =>
      store.markDone(id, { processed_at: Date.now(), error_message: null }),

    scheduleRetry: (id: number, availableAt: number) =>
      store.scheduleRetry(id, availableAt),

    markFailed: (id: number, reason: string) =>
      store.markFailed(id, { processed_at: Date.now(), error_message: reason }),
  };
}

export type SunatEnrichmentWritebackOutboxRepo = ReturnType<
  typeof createSunatEnrichmentWritebackOutboxRepo
>;
