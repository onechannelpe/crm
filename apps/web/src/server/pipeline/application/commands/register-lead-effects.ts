import type { LeadId } from "~/server/pipeline/domain/lead-record";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import type { LeadDraft } from "../../domain/lead-record";
import type { RegisterLeadDeps } from "../deps/register-lead";
import type { PipelineAuditService } from "../ports/audit-service";

export async function writeLeadRegistrationEffects(input: {
  deps: RegisterLeadDeps;
  auditService: PipelineAuditService;
  actorUserId: number;
  executiveId: number;
  draft: LeadDraft;
  now: number;
}): Promise<Result<{ leadId: LeadId }, DomainError>> {
  const leadId = await input.deps.leads.insert(input.draft);
  await input.deps.leadAssignments.insert({
    leadId,
    executiveId: input.executiveId,
    assignedBy: input.actorUserId,
    isActive: true,
    assignedAt: input.now,
  });
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId,
      eventType: "lead_registered",
      actorUserId: input.actorUserId,
      payload: { ruc: input.draft.ruc, toStage: "PENDING_EXTERNAL_REVIEW" },
      occurredAt: input.now,
    }),
  );
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId,
      eventType: "lead_assigned",
      actorUserId: input.actorUserId,
      subjectUserId: input.executiveId,
      payload: { executiveId: input.executiveId },
      occurredAt: input.now,
    }),
  );
  await input.auditService.log(
    input.actorUserId,
    "lead_registered",
    "lead",
    leadId,
    { ruc: input.draft.ruc, stage: "PENDING_EXTERNAL_REVIEW" },
  );

  return Ok({ leadId });
}
