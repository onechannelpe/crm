import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { isScopingLeadSubject } from "../../domain/lead-subjects";
import { invalidLeadStage, leadNotFound } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { CompleteScopingInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import {
  canCompleteCommercialInput,
  requirePipelineActionAccess,
} from "../policies/access";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadProfileRepository } from "../ports/lead-profile-repository";
import type { PartyRepository } from "../ports/party-repository";
import type { LeadClock } from "../services/lead-clock";

type CompleteScopingCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  leadProfiles: LeadProfileRepository;
  party: PartyRepository;
  clock: LeadClock;
};

export async function completeScopingCommand(
  deps: CompleteScopingCommandDeps,
  input: CompleteScopingInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const canComplete = requirePipelineActionAccess(
    input.actor.role,
    canCompleteCommercialInput,
  );
  if (!canComplete.ok) return canComplete;

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();
  if (!isScopingLeadSubject(lead)) return invalidLeadStage();

  if (lead.executiveId !== input.actor.userId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can complete scoping",
      ),
    );
  }

  const now = deps.clock.now();
  await deps.leadProfiles.upsert({
    leadId: lead.id,
    proveedorActual: input.proveedorActual,
    tasaActual: input.tasaActual,
    gpv: input.gpv,
    ticket: input.ticket,
    linkScope: input.linkScope,
    linkUrl: input.linkUrl,
    onlineScope: input.onlineScope,
    onlineUrl: input.onlineUrl,
    onlineModalidad: input.onlineModalidad,
    updatedAt: now,
    updatedBy: input.actor.userId,
  });

  await deps.party.updateOrganizationCommercial({
    organizationId: lead.organizationId,
    giroNegocio: input.giroNegocio,
  });
  await deps.party.upsertPrimaryLegalRepresentative({
    organizationId: lead.organizationId,
    nombres: input.repLegalNombres,
    apellidoPaterno: input.repLegalApellidoPaterno,
    apellidoMaterno: input.repLegalApellidoMaterno,
    dni: input.repLegalDni,
    telefono: input.repLegalTelefono,
    email: input.repLegalEmail,
  });

  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: {
      kind: "complete_scoping",
      proveedorActual: input.proveedorActual,
      tasaActual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      giroNegocio: input.giroNegocio,
      linkScope: input.linkScope,
      linkUrl: input.linkUrl,
      onlineScope: input.onlineScope,
      onlineUrl: input.onlineUrl,
      onlineModalidad: input.onlineModalidad,
      repLegalNombres: input.repLegalNombres,
      repLegalApellidoPaterno: input.repLegalApellidoPaterno,
      repLegalApellidoMaterno: input.repLegalApellidoMaterno,
      repLegalDni: input.repLegalDni,
      repLegalTelefono: input.repLegalTelefono,
      repLegalEmail: input.repLegalEmail,
    },
  });
  if (!outcome.ok) return outcome;

  return Ok({ leadId: lead.id });
}
