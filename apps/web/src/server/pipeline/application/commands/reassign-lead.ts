import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { ensureCanReassignLead } from "../../domain/assignment";
import { createHistoryEvent } from "../../domain/history";
import type {
  LeadAssignmentRepository,
  LeadHistoryRepository,
  LeadRepository,
  PipelineAuditService,
  PipelineUserRepository,
} from "../ports";

type ReassignLeadDeps = {
  leads: LeadRepository;
  leadAssignments: LeadAssignmentRepository;
  leadHistory: LeadHistoryRepository;
  users: PipelineUserRepository;
};

export async function reassignLead(
  deps: ReassignLeadDeps,
  auditService: PipelineAuditService,
  input: {
    actorUserId: number;
    actorRole: Role;
    leadId: number;
    newExecutiveId: number;
  },
): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:reassign")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const lead = await deps.leads.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  const allowed = ensureCanReassignLead({
    currentExecutiveId: lead.executiveId,
    newExecutiveId: input.newExecutiveId,
  });
  if (!allowed.ok) {
    return allowed;
  }

  const newExecutive = await deps.users.findById(input.newExecutiveId);
  if (!newExecutive || !newExecutive.isActive) {
    return Err(
      domainError(
        "validation",
        "invalid_executive",
        "Target executive not found or inactive",
      ),
    );
  }

  const now = Date.now();
  await deps.leadAssignments.deactivateActiveForLead(input.leadId);
  await deps.leadAssignments.insert({
    leadId: input.leadId,
    executiveId: input.newExecutiveId,
    assignedBy: input.actorUserId,
    isActive: true,
    assignedAt: now,
  });
  await deps.leads.updateById(input.leadId, {
    executiveId: input.newExecutiveId,
    updatedAt: now,
  });
  await deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.leadId,
      eventType: "lead_reassigned",
      actorUserId: input.actorUserId,
      subjectUserId: input.newExecutiveId,
      payload: {
        fromExecutiveId: lead.executiveId,
        toExecutiveId: input.newExecutiveId,
      },
      occurredAt: now,
    }),
  );
  await auditService.log(
    input.actorUserId,
    "lead_reassigned",
    "lead",
    input.leadId,
    {
      from: lead.executiveId,
      to: input.newExecutiveId,
    },
  );

  return Ok(undefined);
}
