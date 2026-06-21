import type { EnrichmentJobRequest } from "~/server/client-search/ports";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";

// Reactor: a freshly registered lead schedules a SUNAT verification of its RUC.
// The job row is written in the same transaction as the registration; the queue
// worker drains it (the doorbell is best-effort, the 30s fallback covers it).
export async function reactToRegistration(
  tx: DatabaseExecutor,
  committed: CommittedLeadEvent[],
): Promise<void> {
  const repo = createSearchEnrichmentRepo(tx);
  const jobsByRuc = new Map<string, EnrichmentJobRequest>();

  for (const { event } of committed) {
    if (event.eventType !== "lead_registered") continue;

    jobsByRuc.set(event.payload.ruc, {
      document_type: "ruc",
      document_value: event.payload.ruc,
      requested_by_user_id: event.actorUserId ?? 0,
      now: event.occurredAt,
      max_attempts: 5,
    });
  }

  await repo.upsertJobs([...jobsByRuc.values()]);
}
