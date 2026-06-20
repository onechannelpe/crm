import { diffFields } from "~/contracts/events";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { RateProposalNumbers } from "~/server/workflow/infrastructure/ports/entities";
import type { EditRateProposalCommandInput } from "~/server/workflow/types";

import { editRateProposal } from "../../lead/domain/decide";
import { runLeadTransaction } from "./transition";

const RATE_FIELD_KEYS = [
  "paybackPricing",
  "proposedDebitRate",
  "proposedCreditRate",
  "proposedForeignRate",
  "fee",
  "currency",
] as const satisfies ReadonlyArray<keyof RateProposalNumbers>;

export async function editRateProposalCommand(
  input: EditRateProposalCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ proposalId: string }, DomainError>> {
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

    const nextNumbers: RateProposalNumbers = {
      proposedDebitRate: input.proposedDebitRate,
      proposedCreditRate: input.proposedCreditRate,
      proposedForeignRate: input.proposedForeignRate,
      fee: input.fee,
      paybackPricing: input.paybackPricing,
      currency: input.currency,
    };

    // The whole proposal arrives, but only moved fields are persisted as a
    // correction. An unchanged proposal leaves persistence untouched.
    const changes = diffFields(latest, nextNumbers, RATE_FIELD_KEYS);
    if (changes.length === 0) {
      return Ok({ proposalId: latest.id });
    }

    const transition = editRateProposal(state, {
      actor: input.actor,
      proposalId: latest.id,
      round: latest.round,
      changes,
      now: ctx.now,
    });
    if (!transition.ok) return transition;

    await ctx.repos.rateProposals.updateNumbers(latest.id, nextNumbers);

    const committed = await ctx.commit(transition.value);
    if (!committed.ok) return committed;

    return Ok({ proposalId: latest.id });
  });
}
