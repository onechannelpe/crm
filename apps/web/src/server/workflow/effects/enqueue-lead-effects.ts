import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";

import { reactToRegistration } from "./reactors/enrichment";
import { reactToFulfillmentChanges } from "./reactors/fulfillment-notify";
import { reactToStageChanges } from "./reactors/notify";

// Runs in the write transaction, so every outbox row commits atomically with
// the event that produced it. Single derivation for the interactive write path
// and the CSV import path.
export async function enqueueLeadEffects(
  tx: DatabaseExecutor,
  committed: CommittedLeadEvent[],
  now: Date,
): Promise<void> {
  if (committed.length === 0) return;

  await reactToStageChanges(tx, committed, now);
  await reactToFulfillmentChanges(tx, committed, now);
  await reactToRegistration(tx, committed);
}
