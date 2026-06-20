import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";

import { reactToRegistration } from "./reactors/enrichment";
import { reactToStageChanges } from "./reactors/notify";

/**
 * The one place committed lead events fan out to side effects. Runs inside the
 * write transaction, so every outbox row commits atomically with the event that
 * produced it. Called by the interactive write path (runLeadTransaction) and by
 * the CSV import path, so there is a single derivation for both.
 */
export async function enqueueLeadEffects(
  tx: DatabaseExecutor,
  committed: CommittedLeadEvent[],
  now: number,
): Promise<void> {
  if (committed.length === 0) return;

  await reactToStageChanges(tx, committed, now);
  await reactToRegistration(tx, committed);
}
