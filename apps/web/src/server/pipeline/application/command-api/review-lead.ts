import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { invalidLeadInput, leadNotFound } from "../../domain/lead/lead-errors";
import { authorizeLeadOperation } from "../../domain/lead/lead-policies";
import type { LeadAuditRepository } from "../../ports/lead-audit-repository";
import type { LeadEventRepository } from "../../ports/lead-event-repository";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { LeadWriteRepository } from "../../ports/lead-write-repository";
import type { ReviewLeadInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import {
  notifyExecutiveInputRequired,
  notifyReadyForQuotation,
} from "../notifications";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import type { LeadClock } from "../services/lead-clock";
import { executeLeadMutation } from "../services/lead-mutation-orchestrator";

type ReviewLeadCommandDeps = {
  leadReader: LeadReadRepository;
  leadWriter: LeadWriteRepository;
  eventRepository: LeadEventRepository;
  auditRepository: LeadAuditRepository;
  notificationCenter: PipelineNotificationCenter;
  clock: LeadClock;
};

export async function reviewLeadCommand(
  deps: ReviewLeadCommandDeps,
  input: ReviewLeadInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  if (input.actor.branchId == null) {
    return invalidLeadInput("missing_branch", "Branch is required");
  }

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) {
    return leadNotFound();
  }

  const canOperate = authorizeLeadOperation({
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    leadExecutiveId: lead.executiveId,
    operation: "review",
  });
  if (!canOperate.ok) {
    return canOperate;
  }

  const now = deps.clock.now();
  const outcome = await executeLeadMutation({
    deps,
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: {
      kind: "review",
      status: input.status,
      prioridad: input.prioridad,
      reason: input.reason,
    },
  });
  if (!outcome.ok) {
    return outcome;
  }

  const stageTransition = outcome.value.events.history.find(
    (event) => event.eventType === "workflow_stage_changed",
  );
  const nextStage =
    stageTransition?.eventType === "workflow_stage_changed"
      ? stageTransition.payload.to
      : lead.stage;

  if (nextStage === "NEEDS_EXECUTIVE_INPUT") {
    await notifyExecutiveInputRequired({
      center: deps.notificationCenter,
      executiveId: lead.executiveId,
      leadId: lead.id,
      ruc: lead.ruc,
    });
  }

  if (nextStage === "READY_FOR_QUOTATION") {
    await notifyReadyForQuotation({
      center: deps.notificationCenter,
      branchId: input.actor.branchId,
      leadId: lead.id,
      ruc: lead.ruc,
    });
  }

  return Ok({ leadId: lead.id });
}
