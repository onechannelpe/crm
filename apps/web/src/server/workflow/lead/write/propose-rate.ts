import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { ProposeRateCommandInput } from "~/server/workflow/types";

import { proposeRate } from "../../lead/domain/decide";
import { resolveRateProposalPolicy } from "../../lead/domain/pricing";
import { computeReservationExpiry } from "../../lead/domain/reservation";
import { runLeadTransaction } from "./transition";

export async function proposeRateCommand(
  input: ProposeRateCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ proposalId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const round = await ctx.repos.rateProposals.nextRound(state.id);
    const proposalId = randomUUIDv7();
    const policy = resolveRateProposalPolicy({
      branchPolicy: await ctx.repos.rateProposalPolicies.findByBranchId(
        input.actor.branchId,
      ),
    });
    const reservationExpiresAt = computeReservationExpiry({
      now: ctx.now,
      validityDays: policy.validityDays,
    });

    const transition = proposeRate(state, {
      actor: input.actor,
      proposalId,
      round,
      currency: input.currency,
      reservationExpiresAt,
      now: ctx.now,
    });
    if (!transition.ok) return transition;

    await ctx.repos.rateProposals.insert({
      id: proposalId,
      leadId: state.id,
      round,
      proposedDebitRate: input.proposedDebitRate,
      proposedCreditRate: input.proposedCreditRate,
      proposedForeignRate: input.proposedForeignRate,
      fee: input.fee,
      paybackPricing: input.paybackPricing,
      currency: input.currency,
      proposedBy: input.actor.userId,
      proposedAt: ctx.now,
      outcome: "pending",
      decidedAt: null,
    });

    const committed = await ctx.commit(transition.value);
    if (!committed.ok) return committed;

    return Ok({ proposalId });
  });
}
