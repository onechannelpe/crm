import { randomUUIDv7 } from "bun";

import type { Moneda } from "~/contracts/workflow";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { createQuotation } from "../../domain/lead/transitions";
import type { LeadStateRepository } from "../../infrastructure/lead-state-repo";
import type { LeadQuotationRepository } from "../ports/entities";
import type { LeadUnitOfWork } from "../ports/uow";

type Ports = {
  leads: LeadStateRepository;
  uow: LeadUnitOfWork;
  leadQuotations: LeadQuotationRepository;
};

export async function createQuotationCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    paybackPricing: number;
    tarifaDebito: number;
    tarifaCredito: number;
    tarifaForaneo: number;
    fee: number;
    moneda: Moneda;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ id: string }, DomainError>> {
  const state = await ports.leads.findById(input.leadId);
  if (!state) return leadNotFound();

  const now = Date.now();
  const version = await ports.leadQuotations.nextVersion(state.id);
  const quotationId = await ports.leadQuotations.insert({
    leadId: state.id,
    paybackPricing: input.paybackPricing,
    tarifaDebito: input.tarifaDebito,
    tarifaCredito: input.tarifaCredito,
    tarifaForaneo: input.tarifaForaneo,
    fee: input.fee,
    moneda: input.moneda,
    version,
    createdAt: now,
    createdBy: input.actor.userId,
  });

  const transition = createQuotation(state, {
    actor: input.actor,
    quotationId,
    version,
    moneda: input.moneda,
    now,
  });
  if (!transition.ok) return transition;

  const committed = await ports.uow.commit({
    next: transition.value.next,
    events: transition.value.events,
    idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
  });
  if (!committed.ok) return committed;

  return Ok({ id: quotationId });
}
