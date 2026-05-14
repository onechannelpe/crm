import { randomUUIDv7 } from "bun";

import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import {
  parseRequiredLeadPriority,
  parseRequiredLeadStatus,
} from "../../domain/lead-schema-parser";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { reviewLead } from "../../domain/lead/transitions";
import type { LeadStateRepository } from "../../infrastructure/lead-state-repo";
import type { LeadUnitOfWork } from "../ports/uow";

type Ports = {
  leads: LeadStateRepository;
  uow: LeadUnitOfWork;
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

  const state = await ports.leads.findById(input.leadId);
  if (!state) return leadNotFound();

  const transition = reviewLead(state, {
    actor: input.actor,
    status: status.value,
    prioridad: prioridad.value,
    reason: input.reason,
    now: Date.now(),
  });
  if (!transition.ok) return transition;

  const committed = await ports.uow.commit({
    next: transition.value.next,
    events: transition.value.events,
    idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
  });
  if (!committed.ok) return committed;

  return Ok({ leadId: state.id });
}
