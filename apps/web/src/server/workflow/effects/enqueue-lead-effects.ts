import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";
import type { WorkflowWriteContext } from "~/server/workflow/types";

import { reactToRegistration } from "./reactors/enrichment";

export async function enqueueLeadEffects(
  scope: WorkflowWriteContext,
  committed: CommittedLeadEvent[],
): Promise<void> {
  if (committed.length === 0) {
    return;
  }

  await reactToRegistration(scope.executor, committed);
}
