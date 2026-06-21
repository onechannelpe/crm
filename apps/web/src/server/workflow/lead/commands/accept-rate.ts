import type { AcceptRateInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";

import { acceptRate } from "../../lead/domain/decide";
import { isReservationActive } from "../../lead/domain/reservation";
import { runLeadTransaction } from "../write/transition";

export async function acceptRateCommand(
  input: AcceptRateInput & {
    actor: WorkflowActor;
  },
  ports: {
    executor: DatabaseExecutor;
    now: number;
  },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);

    if (!state) {
      return Err(fail("lead_not_found"));
    }

    const latestProposal = await ctx.repos.rateProposals.findLatest(state.id);

    if (!latestProposal || latestProposal.id !== input.proposalId) {
      return Err(fail("rate_proposal_not_found"));
    }

    if (latestProposal.outcome !== "pending") {
      return Err(fail("rate_proposal_not_pending"));
    }

    if (!isReservationActive(state, ctx.now)) {
      return Err(fail("rate_proposal_expired"));
    }

    const transition = acceptRate(state, {
      actor: input.actor,
      proposalId: input.proposalId,
      now: ctx.now,
    });

    if (!transition.ok) {
      return transition;
    }

    await ctx.repos.rateProposals.markOutcome(
      input.proposalId,
      "accepted",
      ctx.now,
    );

    const committed = await ctx.commitTransition(transition.value);

    if (!committed.ok) {
      return committed;
    }

    return Ok({ leadId: state.id });
  });
}
