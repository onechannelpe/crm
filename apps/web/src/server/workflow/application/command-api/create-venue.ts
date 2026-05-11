import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { leadNotFound } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { CreateVenueInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import { canCreateSale, requirePipelineActionAccess } from "../policies/access";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadProfileRepository } from "../ports/lead-profile-repository";
import type { LeadVenueRepository } from "../ports/sale-repository";
import { validateVenueDigitalConfig } from "../services/digital-product-policy";
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
  input: CreateVenueInput,
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

  const profile = await deps.leadProfiles.findByLeadId(input.leadId);
  const digitalConfig = validateVenueDigitalConfig({
    policy: {
      linkScope: profile?.linkScope ?? "none",
      onlineScope: profile?.onlineScope ?? "none",
    },
    config: input.digitalConfig,
  });
  if (!digitalConfig.ok) return digitalConfig;

  const now = deps.clock.now();
  const venueId = await deps.leadVenues.insert({
    leadId: input.leadId,
    nombreComercial: input.nombreComercial,
    posQuantity: input.posQuantity,
    linkUrl: digitalConfig.value.linkUrl,
    onlineUrl: digitalConfig.value.onlineUrl,
    onlineModalidad: digitalConfig.value.onlineModalidad,
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
      digitalConfig: input.digitalConfig,
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
