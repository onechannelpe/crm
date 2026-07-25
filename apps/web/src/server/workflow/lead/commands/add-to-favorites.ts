import { fail, type DomainError } from "~/domain/errors";
import type { WorkflowLeadId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { WorkflowActor } from "~/server/workflow/actor";
import { Err, Ok, type Result } from "~/shared/result";

import { authorizeLeadAction } from "../../lead/domain/policy";
import { runLeadTransaction } from "../write/transition";

export async function addToFavoritesCommand(
  input: { actor: WorkflowActor; leadId: WorkflowLeadId },
  ports: { executor: DatabaseExecutor; now: Date },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);
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
