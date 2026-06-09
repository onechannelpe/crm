import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { authorizeLeadAction } from "../../domain/lead/policy";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

export async function removeFromFavoritesCommand(
  input: { actor: WorkflowActor; leadId: string },
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const leads = createLeadStateRepo(tx);
    const repos = createWorkflowRepos(tx);
    const state = await leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const authz = authorizeLeadAction("view", input.actor, state);
    if (!authz.ok) return authz;

    await repos.leadFavorites.removeForUser({
      leadId: input.leadId,
      userId: input.actor.userId,
    });

    return Ok({ leadId: input.leadId });
  });
}
