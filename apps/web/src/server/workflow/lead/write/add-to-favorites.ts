import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { authorizeLeadAction } from "../../lead/domain/policy";
import { runLeadTransaction } from "./transition";

export async function addToFavoritesCommand(
  input: { actor: WorkflowActor; leadId: string },
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const authz = authorizeLeadAction("view", input.actor, state);
    if (!authz.ok) return authz;

    await ctx.repos.leadFavorites.addForUser({
      leadId: input.leadId,
      userId: input.actor.userId,
      createdAt: ctx.now,
    });

    return Ok({ leadId: input.leadId });
  });
}
