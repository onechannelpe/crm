import type { LeadCommandResult } from "~/contracts/workflow";
import type { SaveCommercialScopeCommandInput } from "~/contracts/workflow";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { parseRequiredAbonoBank } from "../../domain/lead-schema-parser";
import { leadNotFound } from "../../domain/lead/lead-errors";
import {
  canCompleteScoping,
  requirePipelineActionAccess,
} from "../policies/access";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadProfileRepository } from "../ports/lead-profile-repository";
import type { LeadReadRepository } from "../ports/lead-read-repository";
import type { PartyRepository } from "../ports/party-repository";
import type { LeadVenueRepository } from "../ports/sale-repository";
import {
  parseDigitalPolicy,
  toProfileDigitalFields,
  validateDigitalAggregate,
} from "../services/digital-product-policy";
import type { LeadClock } from "../services/lead-clock";

type SaveCommercialScopeCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  leadProfiles: LeadProfileRepository;
  leadVenues: LeadVenueRepository;
  party: PartyRepository;
  clock: LeadClock;
};

export async function saveCommercialScopeCommand(
  deps: SaveCommercialScopeCommandDeps,
  input: SaveCommercialScopeCommandInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const canComplete = requirePipelineActionAccess(
    input.actor.role,
    canCompleteScoping,
  );
  if (!canComplete.ok) return canComplete;

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();

  if (lead.executiveId !== input.actor.userId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can save commercial scope",
      ),
    );
  }

  if (lead.stage !== "SCOPING") {
    return Err(
      domainError("validation", "wrong_stage", "Lead is not in SCOPING stage"),
    );
  }

  const policy = parseDigitalPolicy({
    linkScope: input.linkScope,
    linkUrl: input.linkUrl,
    onlineScope: input.onlineScope,
    onlineUrl: input.onlineUrl,
    onlineModalidad: input.onlineModalidad,
  });
  if (!policy.ok) return policy;

  const venues = await deps.leadVenues.listByLeadId(lead.id);
  if (!venues.ok) return venues;

  const aggregateCheck = validateDigitalAggregate({
    policy: policy.value,
    venues: venues.value,
  });
  if (!aggregateCheck.ok) return aggregateCheck;

  const digitalFields = toProfileDigitalFields(policy.value);
  const abonoBank = parseRequiredAbonoBank(input.abonoBank);
  if (!abonoBank.ok) {
    return abonoBank;
  }
  const now = deps.clock.now();

  await deps.leadProfiles.upsert({
    leadId: lead.id,
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

  await deps.party.updateOrganizationCommercial({
    organizationId: lead.organizationId,
    giroNegocio: input.giroNegocio,
  });

  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: {
      kind: "save_commercial_scope",
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
    },
  });
  if (!outcome.ok) return outcome;

  return Ok({ leadId: lead.id });
}
