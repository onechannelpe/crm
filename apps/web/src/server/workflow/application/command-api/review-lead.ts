import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { LeadReadRepository } from "../../ports/lead-read-repository";
import { prepareLeadCommand } from "../command-kernel/prepare-lead-command";
import type { ReviewLeadInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import {
  notifyExecutiveInputRequired,
  notifyReadyForQuotation,
} from "../notifications";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { WorkflowNotificationCenter } from "../ports/notification-center";
import type { LeadClock } from "../services/lead-clock";

type ReviewLeadCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  notificationCenter: WorkflowNotificationCenter;
  clock: LeadClock;
};

export async function reviewLeadCommand(
  deps: ReviewLeadCommandDeps,
  input: ReviewLeadInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const prepared = await prepareLeadCommand({
    leadReader: deps.leadReader,
    clock: deps.clock,
    actor: input.actor,
    leadId: input.leadId,
    operation: "review",
  });
  if (!prepared.ok) {
    return prepared;
  }

  const outcome = await deps.mutationUow.commit({
    lead: prepared.value.lead,
    actorUserId: input.actor.userId,
    now: prepared.value.now,
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
      : prepared.value.lead.stage;

  if (nextStage === "NEEDS_EXECUTIVE_INPUT") {
    await notifyExecutiveInputRequired({
      center: deps.notificationCenter,
      executiveId: prepared.value.lead.executiveId,
      leadId: prepared.value.lead.id,
      ruc: prepared.value.lead.ruc,
    });
  }

  if (nextStage === "READY_FOR_QUOTATION") {
    await notifyReadyForQuotation({
      center: deps.notificationCenter,
      branchId: input.actor.branchId,
      leadId: prepared.value.lead.id,
      ruc: prepared.value.lead.ruc,
    });
  }

  return Ok({ leadId: prepared.value.lead.id });
}
