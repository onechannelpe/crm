import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import type { LeadRecord } from "../../domain/lead-record";
import type { RegisterLeadDeps } from "../deps/register-lead";
import type { PipelineAuditService } from "../ports/audit-service";
import { applyLeadMutation } from "../services/lead-mutation-service";

export async function writeLeadReassignmentEffects(input: {
  deps: RegisterLeadDeps;
  auditService: PipelineAuditService;
  actorUserId: number;
  executiveId: number;
  lead: LeadRecord;
  now: number;
  reason?: "inactive_previous_executive";
}): Promise<Result<{ leadId: number }, DomainError>> {
  await input.deps.leadAssignments.deactivateActiveForLead(input.lead.id);
  await input.deps.leadAssignments.insert({
    leadId: input.lead.id,
    executiveId: input.executiveId,
    assignedBy: input.actorUserId,
    isActive: true,
    assignedAt: input.now,
  });
  await applyLeadMutation({
    leads: input.deps.leads,
    leadId: input.lead.id,
    actorUserId: input.actorUserId,
    now: input.now,
    patch: { executiveId: input.executiveId },
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
