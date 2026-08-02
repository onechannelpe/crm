import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";
import type { WorkflowWriteContext } from "~/server/workflow/types";

import { reactToRegistration } from "./reactors/enrichment";
import { reactToFulfillmentChanges } from "./reactors/fulfillment-notify";
import { reactToStageChanges } from "./reactors/notify";

// Runs in the write transaction, so every outbox row commits atomically with
// the event that produced it. Single derivation for the interactive write path
// and the CSV import path.
export async function enqueueLeadEffects(
  scope: WorkflowWriteContext,
  committed: CommittedLeadEvent[],
): Promise<void> {
  if (committed.length === 0) return;

  await reactToStageChanges(scope, committed);
  await reactToFulfillmentChanges(scope, committed);
  await reactToRegistration(scope.executor, committed);
}
