import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { authorizeLeadAction } from "../../domain/lead/policy";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

type Ports = {
  executor: DatabaseExecutor;
};

export async function removeFromFavoritesCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const leads = createLeadStateRepo(tx);
    const repos = createWorkflowRepos(tx);
    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const authz = authorizeLeadAction("view", input.actor, state);
    if (!authz.ok) return authz;

    await repos.leadFavorites.removeForUser({
      leadId: input.leadId,
      userId: input.actor.userId,
    });

    return Ok({ leadId: input.leadId });
  });
}
