import { randomUUIDv7 } from "bun";

import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { createVenue } from "../../domain/lead/transitions";
import type { LeadStateRepository } from "../../infrastructure/lead-state-repo";
import type {
  LeadProfileRepository,
  LeadVenueRepository,
} from "../ports/entities";
import type { LeadUnitOfWork } from "../ports/uow";
import {
  parseVenueDigitalFields,
  toVenueDigitalInsert,
} from "../services/digital-product-policy";

type Ports = {
  leads: LeadStateRepository;
  uow: LeadUnitOfWork;
  leadProfiles: LeadProfileRepository;
  leadVenues: LeadVenueRepository;
};

export async function createVenueCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    nombreComercial: string;
    posQuantity: number;
    digitalConfig: Parameters<typeof parseVenueDigitalFields>[1];
    direccion: string;
    referencia: string;
    distrito: string;
    provincia: string;
    departamento: string;
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  const state = await ports.leads.findById(input.leadId);
  if (!state) return leadNotFound();

  const profile = await ports.leadProfiles.findByLeadId(input.leadId);

  const venueFields = parseVenueDigitalFields(
    {
      linkScope: profile?.linkScope ?? "none",
      onlineScope: profile?.onlineScope ?? "none",
    },
    input.digitalConfig,
  );
  if (!venueFields.ok) return venueFields;

  const now = Date.now();
  const venueId = await ports.leadVenues.insert({
    leadId: input.leadId,
    nombreComercial: input.nombreComercial,
    posQuantity: input.posQuantity,
    ...toVenueDigitalInsert(venueFields.value),
    direccion: input.direccion,
    referencia: input.referencia,
    distrito: input.distrito,
    provincia: input.provincia,
    departamento: input.departamento,
    createdAt: now,
    createdBy: input.actor.userId,
  });

  const transition = createVenue(state, {
    actor: input.actor,
    venueId,
    nombreComercial: input.nombreComercial,
    posQuantity: input.posQuantity,
    direccion: input.direccion,
    referencia: input.referencia,
    distrito: input.distrito,
    provincia: input.provincia,
    departamento: input.departamento,
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
