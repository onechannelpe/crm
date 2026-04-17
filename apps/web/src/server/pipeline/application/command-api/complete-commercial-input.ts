import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { isNeedsExecutiveInputLeadSubject } from "../../domain/lead-subjects";
import { invalidLeadStage, leadNotFound } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { CompleteCommercialInputInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import { notifyReadyForQuotation } from "../notifications";
import {
  canCompleteCommercialInput,
  requirePipelineActionAccess,
} from "../policies/access";
import type { LeadCommercialInputRepository } from "../ports/commercial-input-repository";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import type { LeadClock } from "../services/lead-clock";

type CompleteCommercialInputCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  leadCommercialInputs: LeadCommercialInputRepository;
  notificationCenter: PipelineNotificationCenter;
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
    abono: input.abono,
    cantidadPos: input.cantidadPos,
    updatedAt: now,
    updatedBy: input.actor.userId,
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
      abono: input.abono,
      cantidadPos: input.cantidadPos,
    },
  });
  if (!outcome.ok) return outcome;

  await notifyReadyForQuotation({
    center: deps.notificationCenter,
    branchId: input.actor.branchId,
    leadId: lead.id,
    ruc: lead.ruc,
  });

  return Ok({ leadId: lead.id });
}
