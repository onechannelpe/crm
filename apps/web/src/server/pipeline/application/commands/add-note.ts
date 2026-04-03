import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import type { LeadInteractionDeps } from "../deps/lead-interactions";
import { requireLeadAccess, requireLeadReadAccess } from "../policies/access";
import type { PipelineAuditService } from "../ports/audit-service";

export async function addNote(
  deps: LeadInteractionDeps,
  auditService: PipelineAuditService,
  input: {
    actorUserId: number;
    actorRole: Role;
    leadId: number;
    body: string;
  },
): Promise<Result<{ interactionId: number }, DomainError>> {
  const canRead = requireLeadReadAccess(input.actorRole);
  if (!canRead.ok) {
    return canRead;
  }

  const body = input.body.trim();
  if (!body) {
    return Err(
      domainError("validation", "note_required", "Note body is required"),
    );
  }

  const lead = await deps.leads.findById(input.leadId);
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
  const historyId = await deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.leadId,
      eventType: "note_added",
      actorUserId: input.actorUserId,
      payload: { body },
      occurredAt: now,
    }),
  );
  await auditService.log(
    input.actorUserId,
    "note_added",
    "lead",
    input.leadId,
    {
      historyId,
    },
  );

  return Ok({ interactionId: historyId });
}
