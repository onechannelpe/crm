import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { authorizeLeadAction } from "../../lead/domain/policy";
import { runLeadTransaction } from "./transition";

export async function deleteLeadCommand(
  input: { actor: WorkflowActor; leadId: string },
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const authz = authorizeLeadAction("delete", input.actor, state);
    if (!authz.ok) return authz;

    // Idempotent: deleting an already-deleted lead is a no-op, not an error.
    if (state.deletedAt !== null) return Ok({ leadId: input.leadId });

    await ctx.tx
      .updateTable("workflow_leads")
      .set({
        deleted_at: ctx.now,
        updated_at: ctx.now,
        updated_by: input.actor.userId,
        version: state.version + 1,
      })
      .where("id", "=", input.leadId)
      .execute();

    return Ok({ leadId: input.leadId });
  });
}
