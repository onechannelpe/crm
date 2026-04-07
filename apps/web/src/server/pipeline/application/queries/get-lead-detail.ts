import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadDetailView } from "../contracts";
import type { LeadDetailDeps } from "../deps/lead-queries";
import { canRevealFullTimeline, requireLeadAccess } from "../policies/access";
import { resolveAvailableActions } from "../policies/action-availability";
import { presentLeadDetail } from "../presenters/lead-detail";

export async function getLeadDetail(
  deps: LeadDetailDeps,
  input: {
    actorUserId: number;
    actorRole: Role;
    leadId: number;
  },
): Promise<Result<LeadDetailView, DomainError>> {
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
  if (!history.ok) {
    return history;
  }

  return Ok(
    presentLeadDetail({
      lead,
      commercialInput,
      quotations,
      sale,
      history: history.value,
      canRevealFullTimeline: canRevealFullTimeline(input.actorRole),
      availableActions: resolveAvailableActions({
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        executiveId: lead.executiveId,
        stage: lead.stage,
      }),
    }),
  );
}
