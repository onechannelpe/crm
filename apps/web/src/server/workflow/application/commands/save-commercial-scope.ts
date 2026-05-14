import { randomUUIDv7 } from "bun";

import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type {
  ModalidadCobro,
  ProductScope,
} from "~/contracts/workflow/vocabulary";
import type { WorkflowActor } from "~/server/workflow/types";

import { parseRequiredAbonoBank } from "../../domain/lead-schema-parser";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { saveCommercialScope } from "../../domain/lead/transitions";
import type { LeadStateRepository } from "../../infrastructure/lead-state-repo";
import type {
  LeadProfileRepository,
  LeadVenueRepository,
  PartyRepository,
} from "../ports/entities";
import type { LeadUnitOfWork } from "../ports/uow";
import {
  parseDigitalPolicy,
  toProfileDigitalFields,
  validateDigitalAggregate,
} from "../services/digital-product-policy";

type Ports = {
  leads: LeadStateRepository;
  uow: LeadUnitOfWork;
  leadProfiles: LeadProfileRepository;
  leadVenues: LeadVenueRepository;
  party: PartyRepository;
};

export async function saveCommercialScopeCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    proveedorActual: string;
    tasaActual: number;
    gpv: number;
    ticket: number;
    giroNegocio: string;
    abonoBank: string;
    posTotal: number;
    linkScope: ProductScope;
    linkUrl: string | null;
    onlineScope: ProductScope;
    onlineUrl: string | null;
    onlineModalidad: ModalidadCobro | null;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  const state = await ports.leads.findById(input.leadId);
  if (!state) return leadNotFound();

  const policy = parseDigitalPolicy({
    linkScope: input.linkScope,
    linkUrl: input.linkUrl,
    onlineScope: input.onlineScope,
    onlineUrl: input.onlineUrl,
    onlineModalidad: input.onlineModalidad,
  });
  if (!policy.ok) return policy;

  const venues = await ports.leadVenues.listByLeadId(state.id);
  if (!venues.ok) return venues;

  const aggregateCheck = validateDigitalAggregate({
    policy: policy.value,
    venues: venues.value,
  });
  if (!aggregateCheck.ok) return aggregateCheck;

  const abonoBank = parseRequiredAbonoBank(input.abonoBank);
  if (!abonoBank.ok) return abonoBank;

  const digitalFields = toProfileDigitalFields(policy.value);
  const now = Date.now();

  await ports.leadProfiles.upsert({
    leadId: state.id,
    proveedorActual: input.proveedorActual,
    tasaActual: input.tasaActual,
    gpv: input.gpv,
    ticket: input.ticket,
    abonoBank: abonoBank.value,
    posTotal: input.posTotal,
    ...digitalFields,
    updatedAt: now,
    updatedBy: input.actor.userId,
  });

  await ports.party.updateOrganizationCommercial({
    organizationId: state.organizationId,
    giroNegocio: input.giroNegocio,
  });

  const transition = saveCommercialScope(state, {
    actor: input.actor,
    proveedorActual: input.proveedorActual,
    tasaActual: input.tasaActual,
    gpv: input.gpv,
    ticket: input.ticket,
    giroNegocio: input.giroNegocio,
    abonoBank: abonoBank.value,
    posTotal: input.posTotal,
    linkScope: digitalFields.linkScope,
    linkUrl: digitalFields.linkUrl,
    onlineScope: digitalFields.onlineScope,
    onlineUrl: digitalFields.onlineUrl,
    onlineModalidad: digitalFields.onlineModalidad,
    now,
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
