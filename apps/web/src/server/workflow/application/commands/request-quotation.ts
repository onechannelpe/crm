import { randomUUIDv7 } from "bun";

import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { resolveLeadBlockingFields } from "../../domain/lead-progress";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { requestQuotation } from "../../domain/lead/transitions";
import type { LeadStateRepository } from "../../infrastructure/lead-state-repo";
import type { LeadProfileRepository, PartyRepository } from "../ports/entities";
import type { LeadUnitOfWork } from "../ports/uow";

type Ports = {
  leads: LeadStateRepository;
  uow: LeadUnitOfWork;
  leadProfiles: LeadProfileRepository;
  party: PartyRepository;
};

export async function requestQuotationCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  const state = await ports.leads.findById(input.leadId);
  if (!state) return leadNotFound();

  const [profile, organization] = await Promise.all([
    ports.leadProfiles.findByLeadId(state.id),
    ports.party.findOrganizationById(state.organizationId),
  ]);

  const profileWithGiro = profile
    ? { ...profile, giroNegocio: organization?.giroNegocio ?? null }
    : null;

  const blockingFields = resolveLeadBlockingFields({
    stage: state.stage,
    profile: profileWithGiro,
  });

  if (blockingFields.length > 0) {
    return Err(
      domainError(
        "conflict",
        "blocking_fields_present",
        "Commercial scope is incomplete",
      ),
    );
  }

  const now = Date.now();
  const transition = requestQuotation(state, { actor: input.actor, now });
  if (!transition.ok) return transition;

  const committed = await ports.uow.commit({
    next: transition.value.next,
    events: transition.value.events,
    idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
  });
  if (!committed.ok) return committed;

  return Ok({ leadId: state.id });
}
