import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { ensureCanReassignLead } from "../../domain/assignment";
import type { RegisterLeadDeps } from "../deps/register-lead";
import {
  canReassignLead,
  requireLeadAccess,
  requirePipelineActionAccess,
} from "../policies/access";
import type { PipelineAuditService } from "../ports/audit-service";
import { writeLeadReassignmentEffects } from "./reassign-lead-effects";
import { ensureActiveExecutive } from "./register-lead-resolution";

export async function reassignLead(input: {
  deps: RegisterLeadDeps;
  auditService: PipelineAuditService;
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  newExecutiveId: number;
}): Promise<Result<void, DomainError>> {
  const canReassign = requirePipelineActionAccess(
    input.actorRole,
    canReassignLead,
  );
  if (!canReassign.ok) {
    return canReassign;
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

  const allowed = ensureCanReassignLead({
    currentExecutiveId: lead.executiveId,
    newExecutiveId: input.newExecutiveId,
  });
  if (!allowed.ok) {
    return allowed;
  }

  const activeExecutive = await ensureActiveExecutive({
    deps: input.deps,
    executiveId: input.newExecutiveId,
  });
  if (!activeExecutive.ok) {
    return activeExecutive;
  }

  const result = await writeLeadReassignmentEffects({
    deps: input.deps,
    auditService: input.auditService,
    lead,
    actorUserId: input.actorUserId,
    executiveId: input.newExecutiveId,
    now: Date.now(),
  });
  if (!result.ok) {
    return result;
  }

  return Ok(undefined);
}
