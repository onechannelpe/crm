import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { startSetupExecution } from "../../domain/lead/transitions";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";
import {
  parseDigitalPolicy,
  validateDigitalAggregate,
} from "../services/digital-product-policy";

type Ports = {
  executor: DatabaseExecutor;
};

export async function startSetupExecutionCommand(
  input: { actor: WorkflowActor; leadId: string },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const profile = await repos.leadProfiles.findByLeadId(input.leadId);
    const policy = parseDigitalPolicy({
      linkScope: profile?.linkScope ?? "none",
      linkUrl: profile?.linkUrl ?? null,
      onlineScope: profile?.onlineScope ?? "none",
      onlineUrl: profile?.onlineUrl ?? null,
      onlineModalidad: profile?.onlineModalidad ?? null,
    });
    if (!policy.ok) return policy;

    const venues = await repos.leadVenues.listByLeadId(state.id);
    if (!venues.ok) return venues;

    const aggregateCheck = validateDigitalAggregate({
      policy: policy.value,
      venues: venues.value,
    });
    if (!aggregateCheck.ok) return aggregateCheck;

    const now = Date.now();
    const transition = startSetupExecution(state, { actor: input.actor, now });
    if (!transition.ok) return transition;

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
