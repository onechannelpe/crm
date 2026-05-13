import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadRecord } from "../../domain/lead-record";
import { requireLeadAccess } from "../policies/access";
import type { LeadReadRepository } from "../ports/lead-read-repository";

export async function requireReadableLead(input: {
  leadId: string;
  actorUserId: number;
  actorRole: Role;
  leadReader: LeadReadRepository;
}): Promise<Result<LeadRecord, DomainError>> {
  const lead = await input.leadReader.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  const access = requireLeadAccess({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    executiveId: lead.executiveId,
  });
  if (!access.ok) {
    return access;
  }
  return Ok(lead);
}
