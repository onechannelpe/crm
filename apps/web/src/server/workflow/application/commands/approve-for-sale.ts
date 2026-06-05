import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { approveForSale } from "../../domain/lead/transitions";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";

type Ports = {
  executor: DatabaseExecutor;
};

export async function approveForSaleCommand(
  input: { actor: WorkflowActor; leadId: string },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);
    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const now = Date.now();
    const transition = approveForSale(state, { actor: input.actor, now });
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
