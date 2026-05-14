import { randomUUIDv7 } from "bun";

import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadCallOutcome } from "~/contracts/workflow";
import type { WorkflowActor } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { logCall } from "../../domain/lead/transitions";
import type { LeadStateRepository } from "../../infrastructure/lead-state-repo";
import type { LeadUnitOfWork } from "../ports/uow";

type Ports = {
  leads: LeadStateRepository;
  uow: LeadUnitOfWork;
};

export async function logLeadCallCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    outcome: LeadCallOutcome;
    notes?: string | null;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ interactionId: string }, DomainError>> {
  const state = await ports.leads.findById(input.leadId);
  if (!state) return leadNotFound();

  const now = Date.now();
  const transition = logCall(state, {
    actor: input.actor,
    outcome: input.outcome,
    notes: input.notes?.trim() ?? null,
    now,
  });
  if (!transition.ok) return transition;

  const committed = await ports.uow.commit({
    next: transition.value.next,
    events: transition.value.events,
    idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
  });
  if (!committed.ok) return committed;

  return Ok({ interactionId: committed.value.eventIds[0]! });
}
