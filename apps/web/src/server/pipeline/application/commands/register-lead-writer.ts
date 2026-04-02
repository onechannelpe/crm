import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import type { LeadDraft } from "../../domain/lead";
import type {
  createPipelineAuditService,
  createPipelineDeps,
} from "../../infrastructure/deps";
import type { ExistingLead } from "./register-lead-resolution";

type PipelineCommandDeps = ReturnType<typeof createPipelineDeps>;
type PipelineAuditService = ReturnType<typeof createPipelineAuditService>;

export async function createRegisteredLead(input: {
  deps: PipelineCommandDeps;
  auditService: PipelineAuditService;
  actorUserId: number;
  executiveId: number;
  draft: LeadDraft;
  now: number;
}): Promise<Result<{ leadId: number }, DomainError>> {
  const leadId = await input.deps.leads.insert(input.draft);
  await input.deps.leadAssignments.insert({
    lead_id: leadId,
    executive_id: input.executiveId,
    assigned_by: input.actorUserId,
    is_active: 1,
    assigned_at: input.now,
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

export async function reassignExistingLeadOnRegistration(input: {
  deps: PipelineCommandDeps;
  auditService: PipelineAuditService;
  actorUserId: number;
  executiveId: number;
  lead: ExistingLead;
  now: number;
}): Promise<Result<{ leadId: number }, DomainError>> {
  await input.deps.leadAssignments.deactivateActiveForLead(input.lead.id);
  await input.deps.leadAssignments.insert({
    lead_id: input.lead.id,
    executive_id: input.executiveId,
    assigned_by: input.actorUserId,
    is_active: 1,
    assigned_at: input.now,
  });
  await input.deps.leads.updateById(input.lead.id, {
    executive_id: input.executiveId,
    updated_at: input.now,
  });
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
      eventType: "lead_reassigned",
      actorUserId: input.actorUserId,
      subjectUserId: input.executiveId,
      payload: {
        fromExecutiveId: input.lead.executive_id,
        toExecutiveId: input.executiveId,
        reason: "inactive_previous_executive",
      },
      occurredAt: input.now,
    }),
  );
  await input.auditService.log(
    input.actorUserId,
    "lead_reassigned",
    "lead",
    input.lead.id,
    {
      from: input.lead.executive_id,
      to: input.executiveId,
      reason: "inactive_previous_executive",
    },
  );

  return Ok({ leadId: input.lead.id });
}
