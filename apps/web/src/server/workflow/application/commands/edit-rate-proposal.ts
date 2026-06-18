import { randomUUIDv7 } from "bun";

import { diffFields } from "~/contracts/events";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { RateProposalNumbers } from "~/server/workflow/application/ports/entities";
import type { EditRateProposalCommandInput } from "~/server/workflow/types";

import { editRateProposal } from "../../domain/lead/commands";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

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
    const now = ports.now;
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
      now,
    });
    if (!transition.ok) return transition;

    await repos.rateProposals.updateNumbers(latest.id, nextNumbers);

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ proposalId: latest.id });
  });
}
