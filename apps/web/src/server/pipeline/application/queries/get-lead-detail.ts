import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { requireLeadAccess } from "../policies/access";
import type {
  LeadCommercialInputRepository,
  LeadHistoryRepository,
  LeadQuotationRepository,
  LeadRepository,
  LeadSaleRepository,
} from "../ports";
import {
  presentLeadDetail,
  type LeadDetailOutput,
} from "../presenters/lead-detail";

export type { LeadDetailOutput };

type GetLeadDetailDeps = {
  leads: LeadRepository;
  leadCommercialInputs: LeadCommercialInputRepository;
  leadHistory: LeadHistoryRepository;
  leadQuotations: LeadQuotationRepository;
  leadSales: LeadSaleRepository;
};

export async function getLeadDetail(
  deps: GetLeadDetailDeps,
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
