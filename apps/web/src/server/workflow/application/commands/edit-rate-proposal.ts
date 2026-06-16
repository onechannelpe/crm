import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { EditRateProposalCommandInput } from "~/server/workflow/types";

import { editRateProposal } from "../../domain/lead/commands";
import { isReservationActive } from "../../domain/lead/reservation";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

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
    if (!isReservationActive(state, now)) {
      return Err(fail("rate_proposal_expired"));
    }

    const transition = editRateProposal(state, {
      actor: input.actor,
      proposalId: latest.id,
      round: latest.round,
      now,
    });
    if (!transition.ok) return transition;

    await repos.rateProposals.updateNumbers(latest.id, {
      tarifaDebito: input.tarifaDebito,
      tarifaCredito: input.tarifaCredito,
      tarifaForaneo: input.tarifaForaneo,
      fee: input.fee,
      paybackPricing: input.paybackPricing,
      moneda: input.moneda,
    });

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ proposalId: latest.id });
  });
}
