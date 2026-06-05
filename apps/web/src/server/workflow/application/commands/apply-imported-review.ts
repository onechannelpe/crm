import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { ApplyImportedReviewCommandInput } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { applyImportedReview } from "../../domain/lead/transitions";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";

type Ports = {
  executor: DatabaseExecutor;
};

export async function applyImportedReviewCommand(
  input: ApplyImportedReviewCommandInput,
  ports: Ports,
): Promise<Result<{ applied: boolean; leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);
    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const now = Date.now();
    const transition = applyImportedReview(state, {
      actor: input.actor,
      type: input.type,
      status: input.status ?? null,
      prioridad: input.prioridad ?? null,
      now,
    });
    if (!transition.ok) return transition;

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: randomUUIDv7(),
    });

    if (!committed.ok) {
      if (committed.error.code === "concurrency_conflict") {
        return Ok({ applied: false, leadId: state.id });
      }
      return committed;
    }

    return Ok({ applied: true, leadId: state.id });
  });
}
