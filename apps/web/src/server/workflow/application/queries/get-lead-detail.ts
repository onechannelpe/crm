import type { Role } from "~/lib/auth/access/rbac";
import { createLogger } from "~/lib/observability/logger";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadDetailDeps } from "../deps/lead-queries";
import { canRevealFullTimeline, requireLeadAccess } from "../policies/access";
import { resolveAvailableActions } from "../policies/action-availability";
import { presentLeadDetail } from "../presenters/lead-detail";
import type { LeadDetailView } from "./views/lead-detail";

const logger = createLogger("workflow-get-lead-detail");

function isRecoverableSectionError(error: DomainError): boolean {
  return error.kind === "external";
}

function reportSectionDegradation(section: string, error: DomainError): void {
  logger.error("workflow_lead_detail_degraded_section", {
    section,
    domainKind: error.kind,
    domainCode: error.code,
    domainMessage: error.message,
    domainDetails: error.details,
  });
}

export async function getLeadDetail(
  deps: LeadDetailDeps,
  input: {
    actorUserId: number;
    actorRole: Role;
    leadId: string;
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
    isFavorite,
    commercialInput,
    quotations,
    sale,
    venuesResult,
    negotiationRequestRows,
    historyResult,
    sourceStatus,
    userRows,
    organization,
    legalRepresentative,
  ] = await Promise.all([
    deps.leadFavorites.isFavoriteForUser({
      leadId: input.leadId,
      userId: input.actorUserId,
    }),
    deps.leadCommercialInputs.findByLeadId(input.leadId),
    deps.leadQuotations.listByLeadId(input.leadId),
    deps.leadSales.findByLeadId(input.leadId),
    deps.leadSaleVenues.listByLeadId(input.leadId),
    deps.leadNegotiationRequests.listByLeadId(input.leadId),
    deps.leadHistory.listByLeadId(input.leadId),
    deps.sourceStatuses.findByRuc(lead.ruc),
    deps.users.findByIds([
      lead.executiveId,
      lead.createdBy,
      ...(lead.updatedBy ? [lead.updatedBy] : []),
    ]),
    deps.party.findOrganizationById(lead.organizationId),
    deps.party.findPrimaryLegalRepresentative(lead.organizationId),
  ]);

  if (!historyResult.ok && !isRecoverableSectionError(historyResult.error)) {
    return historyResult;
  }
  if (!venuesResult.ok && !isRecoverableSectionError(venuesResult.error)) {
    return venuesResult;
  }

  const history = historyResult.ok ? historyResult.value : [];
  const venues = venuesResult.ok ? venuesResult.value : [];
  if (!historyResult.ok) {
    reportSectionDegradation("history", historyResult.error);
  }
  if (!venuesResult.ok) {
    reportSectionDegradation("sale_venues", venuesResult.error);
  }

  const negotiationRequests = await Promise.all(
    negotiationRequestRows.map(async (req) => ({
      request: req,
      files: await deps.negotiationFiles.listByNegotiationRequestId(req.id),
    })),
  );

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
    lead,
    negotiationRequestCount: negotiationRequestRows.length,
  });

  return Ok(
    presentLeadDetail({
      lead,
      isFavorite,
      executiveName,
      createdByName,
      updatedByName,
      commercialInput,
      quotations,
      sale,
      venues,
      negotiationRequests,
      history,
      canRevealFullTimeline: canRevealTimeline,
      availableActions,
      sourceStatus,
      organization,
      legalRepresentative,
    }),
  );
}
