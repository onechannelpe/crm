import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { AcceptRateCommandInput } from "~/server/workflow/types";

import { acceptRate } from "../../domain/lead/commands";
import { isReservationActive } from "../../domain/lead/reservation";
import { runLeadTransaction } from "../lead-transaction";

export async function acceptRateCommand(
  input: AcceptRateCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const latest = await ctx.repos.rateProposals.findLatest(state.id);
    if (!latest || latest.id !== input.proposalId) {
      return Err(fail("rate_proposal_not_found"));
    }
    if (latest.outcome !== "pending") {
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
    if (!transition.ok) return transition;

    await ctx.repos.rateProposals.markOutcome(
      input.proposalId,
      "accepted",
      ctx.now,
    );

    const committed = await ctx.commit(transition.value);
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
