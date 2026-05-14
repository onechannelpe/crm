import { randomUUIDv7 } from "bun";

import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { approveForSale } from "../../domain/lead/transitions";
import type { LeadStateRepository } from "../../infrastructure/lead-state-repo";
import type { LeadUnitOfWork } from "../ports/uow";

type Ports = {
  leads: LeadStateRepository;
  uow: LeadUnitOfWork;
};

export async function approveForSaleCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  const state = await ports.leads.findById(input.leadId);
  if (!state) return leadNotFound();

  const now = Date.now();
  const transition = approveForSale(state, { actor: input.actor, now });
  if (!transition.ok) return transition;

  const committed = await ports.uow.commit({
    next: transition.value.next,
    events: transition.value.events,
    idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
  });
  if (!committed.ok) return committed;

  return Ok({ leadId: state.id });
}
