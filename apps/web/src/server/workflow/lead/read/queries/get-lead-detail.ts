import type { LeadDetailView } from "~/contracts/workflow/views";
import type { Role } from "~/domain/auth/access/rbac";
import type { DomainError } from "~/domain/errors";
import type { UserId, WorkflowLeadId } from "~/domain/ids";
import {
  authorizeLeadAction,
  canRevealFullTimeline,
  resolveAvailableActions,
} from "~/server/workflow/lead/domain/policy";
import { isReservationActive } from "~/server/workflow/lead/domain/reservation";
import { Ok, type Result } from "~/shared/result";

import { presentLeadDetail } from "../presenters/lead-detail";
import {
  loadLeadDetailSections,
  type LeadDetailQueryDeps,
} from "./load-lead-detail-sections";

export async function getLeadDetail(
  deps: LeadDetailQueryDeps,
  input: {
    actorUserId: UserId;
    actorRole: Role;
    leadId: WorkflowLeadId;
    evaluatedAt: Date;
  },
): Promise<Result<LeadDetailView, DomainError>> {
  const loaded = await loadLeadDetailSections(deps, {
    leadId: input.leadId,
    actorUserId: input.actorUserId,
    evaluatedAt: input.evaluatedAt,
  });
  if (!loaded.ok) {
    return loaded;
  }
  const { lead } = loaded.value;

  const canAccess = authorizeLeadAction(
    "view",
    { userId: input.actorUserId, role: input.actorRole },
    lead,
  );
  if (!canAccess.ok) return canAccess;

  const userMap = new Map(loaded.value.userRows.map((u) => [u.id, u.fullName]));
  const executiveName = userMap.get(lead.executiveId) ?? "Desconocido";
  const createdByName = userMap.get(lead.createdBy) ?? "Desconocido";
  const updatedByName = lead.updatedBy
    ? (userMap.get(lead.updatedBy) ?? null)
    : null;

  const latestProposal = loaded.value.rateProposals.at(-1);
  const now = input.evaluatedAt;
  const canRevealTimeline = canRevealFullTimeline(input.actorRole);
  const availableActions = resolveAvailableActions(
    { userId: input.actorUserId, role: input.actorRole },
    lead,
    {
      hasActivePendingProposal:
        latestProposal?.outcome === "pending" && isReservationActive(lead, now),
      rateRevisionCount: loaded.value.rateRevisionRows.length,
      fulfillmentStep: loaded.value.fulfillment?.order.currentStep ?? null,
    },
  );

  return Ok(
    presentLeadDetail({
      lead,
      isFavorite: loaded.value.isFavorite,
      executiveName,
      createdByName,
      updatedByName,
      commercialScope: loaded.value.commercialScope,
      digitalPolicy: loaded.value.digitalPolicy,
      rateProposals: loaded.value.rateProposals,
      venues: loaded.value.venues,
      rateRevisions: loaded.value.rateRevisions,
      history: loaded.value.history,
      canRevealFullTimeline: canRevealTimeline,
      availableActions,
      sourceStatus: loaded.value.sourceStatus,
      organization: loaded.value.organization,
      legalRepresentative: loaded.value.legalRepresentative,
      fulfillment: loaded.value.fulfillment,
    }),
  );
}
