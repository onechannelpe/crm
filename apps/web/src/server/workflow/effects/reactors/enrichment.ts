import type { EnrichmentRequest } from "~/server/client-search/ports";
import { createCompanyRegistryRepo } from "~/server/client-search/repository";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";

// Reactor: a freshly registered lead schedules a SUNAT verification of its RUC.
// The registry request is written in the same transaction as the registration;
// the queue worker drains it (NOTIFY wakes it, the poll floor backstops).
export async function reactToRegistration(
  tx: DatabaseExecutor,
  committed: CommittedLeadEvent[],
): Promise<void> {
  const repo = createCompanyRegistryRepo(tx);
  const requestsByRuc = new Map<string, EnrichmentRequest>();

  for (const { event } of committed) {
    if (event.eventType !== "lead_registered") continue;

    requestsByRuc.set(event.payload.ruc, {
      documentType: "ruc",
      documentValue: event.payload.ruc,
      requestedByUserId: event.actorUserId ?? null,
      requestedAt: event.occurredAt,
      maxAttempts: 5,
    });
  }

  await repo.upsertRequests([...requestsByRuc.values()]);
}
