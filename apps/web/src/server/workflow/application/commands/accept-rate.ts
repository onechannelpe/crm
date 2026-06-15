import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { AcceptRateCommandInput } from "~/server/workflow/types";

import { acceptRate } from "../../domain/lead/commands";
import { isRateProposalActionable } from "../../domain/pricing-policy";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

export async function acceptRateCommand(
  input: AcceptRateCommandInput,
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const latest = await repos.rateProposals.findLatest(state.id);
    if (!latest || latest.id !== input.proposalId) {
      return Err(fail("rate_proposal_not_found"));
    }
    const now = Date.now();
    if (latest.outcome !== "pending") {
      return Err(fail("rate_proposal_not_pending"));
    }
    if (!isRateProposalActionable(latest, now)) {
      return Err(fail("rate_proposal_expired"));
    }

    const transition = acceptRate(state, {
      actor: input.actor,
      proposalId: input.proposalId,
      now,
    });
    if (!transition.ok) return transition;

    await repos.rateProposals.markOutcome(input.proposalId, "accepted", now);

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
