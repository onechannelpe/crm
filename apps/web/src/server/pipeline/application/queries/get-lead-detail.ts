import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadDetailDeps } from "../deps/lead-queries";
import { canRevealFullTimeline, requireLeadAccess } from "../policies/access";
import { resolveAvailableActions } from "../policies/action-availability";
import { presentLeadDetail } from "../presenters/lead-detail";
import type { LeadDetailView } from "./views/lead-detail";

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

  const [
    commercialInput,
    quotations,
    sale,
    historyResult,
    sourceStatus,
    userRows,
  ] = await Promise.all([
    deps.leadCommercialInputs.findByLeadId(input.leadId),
    deps.leadQuotations.listByLeadId(input.leadId),
    deps.leadSales.findByLeadId(input.leadId),
    deps.leadHistory.listByLeadId(input.leadId),
    deps.sourceStatuses.findByRuc(lead.ruc),
    deps.users.findByIds([
      lead.executiveId,
      lead.createdBy,
      ...(lead.updatedBy ? [lead.updatedBy] : []),
    ]),
  ]);

  if (!historyResult.ok) {
    return historyResult;
  }

  const userMap = new Map(userRows.map((u) => [u.id, u.fullName]));
  const executiveName = userMap.get(lead.executiveId) ?? "Desconocido";
  const createdByName = userMap.get(lead.createdBy) ?? "Desconocido";
  const updatedByName = lead.updatedBy
    ? (userMap.get(lead.updatedBy) ?? null)
    : null;

  const canRevealTimeline = canRevealFullTimeline(input.actorRole);
  const availableActions = resolveAvailableActions({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    executiveId: lead.executiveId,
    stage: lead.stage,
  });

  return Ok(
    presentLeadDetail({
      lead,
      executiveName,
      createdByName,
      updatedByName,
      commercialInput,
      quotations,
      sale,
      history: historyResult.value,
      canRevealFullTimeline: canRevealTimeline,
      availableActions,
      sourceStatus,
    }),
  );
}
