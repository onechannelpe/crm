import type { AcceptRateInput } from "~/contracts/workflow/inputs";
import { fail, type DomainError } from "~/domain/errors";
import type { WorkflowLeadId, WorkflowRateProposalId } from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { WorkflowWriteContext } from "~/server/workflow/types";
import { Err, Ok, type Result } from "~/shared/result";

import { acceptRate } from "../../lead/domain/decide";
import { isReservationActive } from "../../lead/domain/reservation";
import { runLeadTransaction } from "../write/transition";

export async function acceptRateCommand(
  input: Omit<AcceptRateInput, "leadId" | "proposalId"> & {
    actor: WorkflowActor;
    leadId: WorkflowLeadId;
    proposalId: WorkflowRateProposalId;
  },
  scope: WorkflowWriteContext,
): Promise<Result<{ leadId: WorkflowLeadId }, DomainError>> {
  return runLeadTransaction(scope, async (ctx) => {
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

    if (!isReservationActive(state, ctx.operationAt)) {
      return Err(fail("rate_proposal_expired"));
    }

    const transition = acceptRate(state, {
      actor: input.actor,
      proposalId: input.proposalId,
      now: ctx.operationAt,
    });

    if (!transition.ok) {
      return transition;
    }

    await ctx.repos.rateProposals.markOutcome(
      input.proposalId,
      "accepted",
      ctx.operationAt,
    );

    const committed = await ctx.commitTransition(transition.value);

    if (!committed.ok) {
      return committed;
    }

    return Ok({ leadId: state.id });
  });
}
