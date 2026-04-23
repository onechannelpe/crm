import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";
import { Err, Ok } from "~/server/shared/result";

import { requireLeadReadAccess } from "../policies/access";
import type { WorkflowAuditService } from "../ports/audit-service";
import type { LeadEnrichmentQueue } from "../ports/enrichment-queue";
import type { LeadRepository } from "../ports/lead-repository";

export async function requestSunatRefresh(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: string;
  leadRepo: LeadRepository;
  enrichmentQueue: LeadEnrichmentQueue;
  auditService: WorkflowAuditService;
}): Promise<Result<void, DomainError>> {
  const canRead = requireLeadReadAccess(input.actorRole);
  if (!canRead.ok) {
    return canRead;
  }

  const lead = await input.leadRepo.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  await input.enrichmentQueue.enqueueRucVerification(
    lead.ruc,
    input.actorUserId,
  );

  await input.auditService.log(
    input.actorUserId,
    "sunat_refresh_requested",
    "lead",
    input.leadId,
    { ruc: lead.ruc },
  );

  return Ok(void 0);
}
