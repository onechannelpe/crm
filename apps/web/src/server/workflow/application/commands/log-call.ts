import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { LogLeadCallCommandInput } from "~/server/workflow/types";

import { logCall } from "../../domain/lead/commands";
import { runLeadTransaction } from "../lead-transaction";

export async function logLeadCallCommand(
  input: LogLeadCallCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ interactionId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const transition = logCall(state, {
      actor: input.actor,
      outcome: input.outcome,
      notes: input.notes?.trim() ?? null,
      now: ctx.now,
    });
    if (!transition.ok) return transition;

    const committed = await ctx.commit(transition.value);
    if (!committed.ok) return committed;

    return Ok({ interactionId: committed.value.eventIds[0] });
  });
}
