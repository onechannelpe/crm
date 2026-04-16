import type { Role } from "~/lib/auth/access/rbac";
import type { LeadCallOutcome } from "~/pipeline/contracts/lead-schema";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import type { LeadInteractionDeps } from "../deps/lead-interactions";
import {
  canAddLeadInteraction,
  requireLeadAccess,
  requirePipelineActionAccess,
} from "../policies/access";
import type { PipelineAuditService } from "../ports/audit-service";
import { applyLeadMutation } from "../services/lead-mutation-service";

export async function logCall(
  input: {
    deps: LeadInteractionDeps;
    auditService: PipelineAuditService;
    actorUserId: number;
    actorRole: Role;
  } & {
    leadId: number;
    outcome: LeadCallOutcome;
    notes?: string | null;
  },
): Promise<Result<{ interactionId: number }, DomainError>> {
  const canWriteInteraction = requirePipelineActionAccess(
    input.actorRole,
    canAddLeadInteraction,
  );
  if (!canWriteInteraction.ok) {
    return canWriteInteraction;
  }

  const lead = await input.deps.leads.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  const canAccessLead = requireLeadAccess({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    executiveId: lead.executiveId,
  });
  if (!canAccessLead.ok) {
    return canAccessLead;
  }

  const now = Date.now();
  await applyLeadMutation({
    leads: input.deps.leads,
    leadId: input.leadId,
    actorUserId: input.actorUserId,
    now,
  });
  const historyId = await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.leadId,
      eventType: "call_logged",
      actorUserId: input.actorUserId,
      payload: { outcome: input.outcome, notes: input.notes?.trim() ?? null },
      occurredAt: now,
    }),
  );
  await input.auditService.log(
    input.actorUserId,
    "call_logged",
    "lead",
    input.leadId,
    {
      historyId,
      outcome: input.outcome,
    },
  );

  return Ok({ interactionId: historyId });
}
