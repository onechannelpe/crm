import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";
import {
  parseRequiredLeadPriority,
  parseRequiredLeadStatus,
} from "~/server/workflow/parsers";
import type { ReviewLeadCommandInput } from "~/server/workflow/types";

import { reviewLead } from "../../domain/lead/commands";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";

export async function reviewLeadCommand(
  input: ReviewLeadCommandInput,
  ports: { executor: DatabaseExecutor },
): Promise<Result<{ leadId: string }, DomainError>> {
  const status = parseRequiredLeadStatus(input.status);
  if (isErr(status)) return status;

  const prioridad = parseRequiredLeadPriority(input.prioridad);
  if (isErr(prioridad)) return prioridad;

  return ports.executor.transaction().execute(async (tx) => {
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);
    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const transition = reviewLead(state, {
      actor: input.actor,
      status: status.value,
      prioridad: prioridad.value,
      reason: input.reason,
      now: Date.now(),
    });
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
