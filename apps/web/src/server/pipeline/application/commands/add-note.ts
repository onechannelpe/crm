import type { Role } from "~/lib/auth/access/rbac";
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
import type {
  AddNoteInput,
  LeadInteractionResult,
} from "./types/lead-interactions";

export async function addNote(
  input: {
    deps: LeadInteractionDeps;
    auditService: PipelineAuditService;
    actorUserId: number;
    actorRole: Role;
  } & AddNoteInput,
): Promise<Result<LeadInteractionResult, DomainError>> {
  const canWriteInteraction = requirePipelineActionAccess(
    input.actorRole,
    canAddLeadInteraction,
  );
  if (!canWriteInteraction.ok) {
    return canWriteInteraction;
  }

  const body = input.body.trim();
  if (!body) {
    return Err(
      domainError("validation", "note_required", "Note body is required"),
    );
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
  const historyId = await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.leadId,
      eventType: "note_added",
      actorUserId: input.actorUserId,
      payload: { body },
      occurredAt: now,
    }),
  );
  await input.auditService.log(
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
