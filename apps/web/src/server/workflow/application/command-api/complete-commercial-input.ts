import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { isNeedsExecutiveInputLeadSubject } from "../../domain/lead-subjects";
import { invalidLeadStage, leadNotFound } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { CompleteCommercialInputInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import {
  canCompleteCommercialInput,
  requirePipelineActionAccess,
} from "../policies/access";
import type { LeadCommercialInputRepository } from "../ports/commercial-input-repository";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { PartyRepository } from "../ports/party-repository";
import type { LeadClock } from "../services/lead-clock";

type CompleteCommercialInputCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  leadCommercialInputs: LeadCommercialInputRepository;
  party: PartyRepository;
  clock: LeadClock;
};

export async function completeCommercialInputCommand(
  deps: CompleteCommercialInputCommandDeps,
  input: CompleteCommercialInputInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const canComplete = requirePipelineActionAccess(
    input.actor.role,
    canCompleteCommercialInput,
  );
  if (!canComplete.ok) return canComplete;

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();
  if (!isNeedsExecutiveInputLeadSubject(lead)) return invalidLeadStage();

  if (lead.executiveId !== input.actor.userId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can complete commercial input",
      ),
    );
  }

  const now = deps.clock.now();
  await deps.leadCommercialInputs.upsert({
    leadId: lead.id,
    proveedorActual: input.proveedorActual,
    tasaActual: input.tasaActual,
    gpv: input.gpv,
    ticket: input.ticket,
    tipoProducto: input.tipoProducto,
    urlCliente: input.urlCliente,
    modalidadCobro: input.modalidadCobro,
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
      kind: "complete_commercial_input",
      proveedorActual: input.proveedorActual,
      tasaActual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      giroNegocio: input.giroNegocio,
      tipoProducto: input.tipoProducto,
      urlCliente: input.urlCliente,
      modalidadCobro: input.modalidadCobro,
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
