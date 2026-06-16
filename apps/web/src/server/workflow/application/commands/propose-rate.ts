import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { ProposeRateCommandInput } from "~/server/workflow/types";

import { proposeRate } from "../../domain/lead/commands";
import { computeReservationExpiry } from "../../domain/lead/reservation";
import { resolveRateProposalPolicy } from "../../domain/pricing-policy";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

export async function proposeRateCommand(
  input: ProposeRateCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ proposalId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const now = ports.now;
    const round = await repos.rateProposals.nextRound(state.id);
    const proposalId = randomUUIDv7();
    const policy = resolveRateProposalPolicy({
      branchPolicy: await repos.rateProposalPolicies.findByBranchId(
        input.actor.branchId,
      ),
    });
    const reservationExpiresAt = computeReservationExpiry({
      now,
      validityDays: policy.validityDays,
    });

    const transition = proposeRate(state, {
      actor: input.actor,
      proposalId,
      round,
      moneda: input.moneda,
      reservationExpiresAt,
      now,
    });
    if (!transition.ok) return transition;

    await repos.rateProposals.insert({
      id: proposalId,
      leadId: state.id,
      round,
      tarifaDebito: input.tarifaDebito,
      tarifaCredito: input.tarifaCredito,
      tarifaForaneo: input.tarifaForaneo,
      fee: input.fee,
      paybackPricing: input.paybackPricing,
      moneda: input.moneda,
      proposedBy: input.actor.userId,
      proposedAt: now,
      outcome: "pending",
      decidedAt: null,
    });

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ proposalId });
  });
}
