import { fail, type DomainError } from "~/domain/errors";
import type { WorkflowLeadId } from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { WorkflowWriteContext } from "~/server/workflow/types";
import { Err, Ok, type Result } from "~/shared/result";

import { authorizeLeadAction } from "../../lead/domain/policy";
import { runLeadTransaction } from "../write/transition";

export async function removeFromFavoritesCommand(
  input: { actor: WorkflowActor; leadId: WorkflowLeadId },
  scope: WorkflowWriteContext,
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(scope, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const authz = authorizeLeadAction("view", input.actor, state);
    if (!authz.ok) return authz;

    await ctx.repos.leadFavorites.removeForUser({
      leadId: input.leadId,
      userId: input.actor.userId,
    });

    return Ok({ leadId: input.leadId });
  });
}
