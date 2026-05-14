import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import {
  parseRequiredLeadPriority,
  parseRequiredLeadStatus,
} from "../../domain/lead-schema-parser";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { reviewLead } from "../../domain/lead/transitions";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";

type Ports = {
  executor: DatabaseExecutor;
};

export async function reviewLeadCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    status: string;
    prioridad: string;
    reason: string;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  const status = parseRequiredLeadStatus(input.status);
  if (!status.ok) return status;

  const prioridad = parseRequiredLeadPriority(input.prioridad);
  if (!prioridad.ok) return prioridad;

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
      idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
