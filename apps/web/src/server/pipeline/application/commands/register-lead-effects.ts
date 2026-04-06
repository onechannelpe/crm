import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import type { Lead, LeadDraft } from "../../domain/lead";
import type { RegisterLeadDeps } from "../deps/register-lead";
import type { PipelineAuditService } from "../ports/audit-service";
import type { LeadRegisteredResult } from "./types/lead-results";

export async function writeLeadRegistrationEffects(input: {
  deps: RegisterLeadDeps;
  auditService: PipelineAuditService;
  actorUserId: number;
  executiveId: number;
  draft: LeadDraft;
  now: number;
}): Promise<Result<LeadRegisteredResult, DomainError>> {
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

export async function writeLeadReassignmentEffects(input: {
  deps: RegisterLeadDeps;
  auditService: PipelineAuditService;
  actorUserId: number;
  executiveId: number;
  lead: Lead;
  now: number;
  reason?: "inactive_previous_executive";
}): Promise<Result<LeadRegisteredResult, DomainError>> {
  await input.deps.leadAssignments.deactivateActiveForLead(input.lead.id);
  await input.deps.leadAssignments.insert({
    leadId: input.lead.id,
    executiveId: input.executiveId,
    assignedBy: input.actorUserId,
    isActive: true,
    assignedAt: input.now,
  });
  await input.deps.leads.updateById(input.lead.id, {
    executiveId: input.executiveId,
    updatedAt: input.now,
  });
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
      eventType: "lead_reassigned",
      actorUserId: input.actorUserId,
      subjectUserId: input.executiveId,
      payload: {
        fromExecutiveId: input.lead.executiveId,
        toExecutiveId: input.executiveId,
        ...(input.reason ? { reason: input.reason } : {}),
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
      from: input.lead.executiveId,
      to: input.executiveId,
      ...(input.reason ? { reason: input.reason } : {}),
    },
  );

  return Ok({ leadId: input.lead.id });
}
