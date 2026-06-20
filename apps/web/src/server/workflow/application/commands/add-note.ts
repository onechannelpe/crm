import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { AddLeadNoteCommandInput } from "~/server/workflow/types";

import { addNote } from "../../domain/lead/commands";
import { runLeadTransaction } from "../lead-transaction";

export async function addLeadNoteCommand(
  input: AddLeadNoteCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ interactionId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const transition = addNote(state, {
      actor: input.actor,
      body: input.body,
      now: ctx.now,
    });
    if (!transition.ok) return transition;

    const committed = await ctx.commit(transition.value);
    if (!committed.ok) return committed;

    return Ok({ interactionId: committed.value.eventIds[0] });
  });
}
