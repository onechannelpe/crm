import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { isQuotedLeadSubject } from "../../domain/lead-subjects";
import { invalidLeadStage, leadNotFound } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { ApproveForSaleInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import { notifyReadyForSale } from "../notifications";
import { requireLeadActionAccess } from "../policies/lead-action-policy";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { WorkflowNotificationCenter } from "../ports/notification-center";
import type { LeadClock } from "../services/lead-clock";

type ApproveForSaleCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  notificationCenter: WorkflowNotificationCenter;
  clock: LeadClock;
};

export async function approveForSaleCommand(
  deps: ApproveForSaleCommandDeps,
  input: ApproveForSaleInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();
  if (!isQuotedLeadSubject(lead)) return invalidLeadStage();

  const canApprove = requireLeadActionAccess({
    action: "approve-for-sale",
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    lead,
  });
  if (!canApprove.ok) return canApprove;

  const now = deps.clock.now();
  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: { kind: "approve_for_sale" },
  });
  if (!outcome.ok) return outcome;

  await notifyReadyForSale({
    center: deps.notificationCenter,
    executiveId: lead.executiveId,
    leadId: lead.id,
    ruc: lead.ruc,
  });

  return Ok({ leadId: lead.id });
}
