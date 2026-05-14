import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { LeadCommandResult } from "~/server/workflow/types";
import type { CreateVenueCommandInput } from "~/server/workflow/types";

import { leadNotFound } from "../../domain/lead/lead-errors";
import { canCreateSale, requirePipelineActionAccess } from "../policies/access";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadProfileRepository } from "../ports/lead-profile-repository";
import type { LeadReadRepository } from "../ports/lead-read-repository";
import type { LeadVenueRepository } from "../ports/sale-repository";
import {
  parseVenueDigitalFields,
  toVenueDigitalInsert,
} from "../services/digital-product-policy";
import type { LeadClock } from "../services/lead-clock";

type CreateVenueCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  leadProfiles: LeadProfileRepository;
  leadVenues: LeadVenueRepository;
  clock: LeadClock;
};

export async function createVenueCommand(
  deps: CreateVenueCommandDeps,
  input: CreateVenueCommandInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const canCreate = requirePipelineActionAccess(
    input.actor.role,
    canCreateSale,
  );
  if (!canCreate.ok) return canCreate;

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();

  if (lead.executiveId !== input.actor.userId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can create venues",
      ),
    );
  }

  if (lead.stage !== "QUOTING" && lead.stage !== "CLOSING") {
    return Err(
      domainError(
        "validation",
        "wrong_stage",
        "Venues can only be created during QUOTING or CLOSING",
      ),
    );
  }

  const profile = await deps.leadProfiles.findByLeadId(input.leadId);

  const venueFields = parseVenueDigitalFields(
    {
      linkScope: profile?.linkScope ?? "none",
      onlineScope: profile?.onlineScope ?? "none",
    },
    input.digitalConfig,
  );
  if (!venueFields.ok) return venueFields;

  const now = deps.clock.now();
  const venueId = await deps.leadVenues.insert({
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

  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: {
      kind: "create_venue",
      venueId,
      nombreComercial: input.nombreComercial,
      posQuantity: input.posQuantity,
      direccion: input.direccion,
      referencia: input.referencia,
      distrito: input.distrito,
      provincia: input.provincia,
      departamento: input.departamento,
    },
  });
  if (!outcome.ok) return outcome;

  return Ok({ leadId: lead.id });
}
