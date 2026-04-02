import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createPipelineQueryDeps } from "../../infrastructure/deps";
import { requireLeadAccess } from "../policies/access";
import type { PipelineQueryDeps } from "../ports";
import {
  presentLeadDetail,
  type LeadDetailOutput,
} from "../presenters/lead-detail";

export type { LeadDetailOutput };

export async function getLeadDetailWithDeps(
  deps: PipelineQueryDeps,
  input: {
    actorUserId: number;
    actorRole: Role;
    leadId: number;
  },
): Promise<Result<LeadDetailOutput, DomainError>> {
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

  const [commercialInput, quotations, sale, history] = await Promise.all([
    deps.leadCommercialInputs.findByLeadId(input.leadId),
    deps.leadQuotations.listByLeadId(input.leadId),
    deps.leadSales.findByLeadId(input.leadId),
    deps.leadHistory.listByLeadId(input.leadId),
  ]);

  return Ok(
    presentLeadDetail({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      lead,
      commercialInput,
      quotations,
      sale,
      history,
    }),
  );
}

export async function getLeadDetail(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
}): Promise<Result<LeadDetailOutput, DomainError>> {
  const deps = createPipelineQueryDeps();
  return getLeadDetailWithDeps(deps, input);
}
